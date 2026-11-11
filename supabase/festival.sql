begin;
create table if not exists public.festival_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'station'))
);
create table if not exists public.festival_station (
  id boolean primary key default true check (id),
  screen text not null default 'home',
  song text not null default 'bgm1',
  paused boolean not null default false,
  match_id uuid,
  seen timestamptz,
  command jsonb,
  receipt jsonb,
  roster jsonb not null default '{"team":"","names":["",""],"students":["",""]}'
);
insert into public.festival_station(id) values (true) on conflict do nothing;
create table if not exists public.festival_matches (
  id uuid primary key,
  roster jsonb not null
);
create table if not exists public.festival_results (
  id uuid primary key,
  song text not null,
  roster jsonb not null,
  score1 integer not null check (score1 between 0 and 16000),
  score2 integer not null check (score2 between 0 and 16000),
  created_at timestamptz not null default now()
);

alter table public.festival_users enable row level security;
alter table public.festival_station enable row level security;
alter table public.festival_matches enable row level security;
alter table public.festival_results enable row level security;
revoke all on public.festival_users, public.festival_station, public.festival_matches, public.festival_results
  from public, anon, authenticated;

create or replace function public.festival_rpc(operation text, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller text;
  state public.festival_station;
  result jsonb;
  kind text;
  next_screen text;
  next_song text;
  next_match uuid;
begin
  select role into caller from public.festival_users where user_id = auth.uid();
  if caller is null then raise exception '축제 계정 권한이 필요합니다' using errcode = '42501'; end if;

  if operation = 'leaderboard' then
    select coalesce(jsonb_agg(to_jsonb(r)), '[]') into result from (
      select id, roster->>'team' as team, song, score1, score2, created_at
      from public.festival_results
      order by score1 + score2 desc, created_at asc limit 30
    ) r;
    return result;
  end if;

  if operation = 'recent' and caller = 'admin' then
    select coalesce(jsonb_agg(to_jsonb(r)), '[]') into result from (
      select id, roster->>'team' as team, song, score1, score2, created_at
      from public.festival_results order by created_at desc limit 50
    ) r;
    return result;
  end if;

  if operation in ('save_roster', 'command', 'edit_score', 'status') and caller = 'admin' then
    select * into state from public.festival_station where id for update;
    case operation
      when 'save_roster' then
        if jsonb_typeof(payload->'names') is distinct from 'array'
          or jsonb_typeof(payload->'students') is distinct from 'array' then
          raise exception '두 참가자의 정보를 입력하세요';
        end if;
        if jsonb_array_length(payload->'names') <> 2 or jsonb_array_length(payload->'students') <> 2 then
          raise exception '두 참가자의 정보를 입력하세요';
        end if;
        update public.festival_station set roster = jsonb_build_object(
          'team', left(trim(coalesce(payload->>'team', '')), 40),
          'names', jsonb_build_array(left(trim(payload->'names'->>0), 40), left(trim(payload->'names'->>1), 40)),
          'students', jsonb_build_array(left(trim(payload->'students'->>0), 30), left(trim(payload->'students'->>1), 30))
        ) where id;
      when 'command' then
        kind := payload->>'kind';
        if state.seen is null or now() - state.seen > interval '6 seconds' then
          raise exception '게임 PC에 연결되어 있지 않습니다';
        end if;
        if state.command is not null and (state.command->>'expires')::timestamptz > now() then
          raise exception '이전 명령을 처리 중입니다';
        end if;
        if kind is null or kind not in ('select', 'start', 'pause', 'resume') then raise exception '지원하지 않는 명령'; end if;
        if kind = 'select' and coalesce(payload->>'song', '') not in ('bgm1','bgm2','bgm3') then
          raise exception '곡을 다시 선택하세요';
        end if;
        update public.festival_station set command = jsonb_build_object(
          'id', gen_random_uuid(), 'kind', kind, 'song', payload->>'song',
          'expires', now() + interval '8 seconds'), receipt = null where id;
      when 'edit_score' then
        update public.festival_results set score1 = (payload->>'score1')::integer,
          score2 = (payload->>'score2')::integer where id = (payload->>'id')::uuid;
        if not found then raise exception '경기를 찾을 수 없습니다'; end if;
      else null;
    end case;
    select to_jsonb(s) into result from public.festival_station s where id;
    return result;
  end if;

  if operation = 'heartbeat' and caller = 'station' then
    next_screen := payload->>'screen';
    next_song := payload->>'song';
    next_match := (payload->>'match_id')::uuid;
    if next_screen is null or next_screen not in ('home','songs','characters','play','result','board')
      or next_song is null or next_song not in ('bgm1','bgm2','bgm3') then raise exception '잘못된 게임 상태'; end if;
    update public.festival_station set seen = now(), screen = next_screen, song = next_song,
      paused = coalesce((payload->>'paused')::boolean, false), match_id = next_match,
      receipt = case when command->>'id' = payload->'receipt'->>'id' then payload->'receipt' else receipt end,
      command = case when command->>'id' = payload->'receipt'->>'id' or
        (command->>'expires')::timestamptz <= now() then null else command end
    where id returning * into state;
    if next_match is not null and next_screen = 'play' then
      insert into public.festival_matches (id, roster)
      values (next_match, state.roster)
      on conflict (id) do nothing;
    end if;
    return jsonb_build_object('command', state.command,
      'team', state.roster->>'team', 'names', state.roster->'names');
  end if;

  if operation = 'result' and caller = 'station' then
    next_song := payload->>'song';
    if next_song is null or next_song not in ('bgm1','bgm2','bgm3') then raise exception '잘못된 곡'; end if;
    insert into public.festival_results(id, song, roster, score1, score2)
    values ((payload->>'id')::uuid, next_song,
      coalesce((select roster from public.festival_matches where id = (payload->>'id')::uuid),
        jsonb_build_object('team', left(coalesce(payload->>'team', ''), 40))),
      (payload->>'score1')::integer, (payload->>'score2')::integer)
    on conflict (id) do nothing;
    return 'true';
  end if;
  raise exception '이 계정으로 실행할 수 없습니다' using errcode = '42501';
end;
$$;
revoke all on function public.festival_rpc(text,jsonb) from public, anon, authenticated;
grant execute on function public.festival_rpc(text,jsonb) to authenticated;
commit;
