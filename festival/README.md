# 학교 축제 2인 리듬게임

게임 제목은 현재 **RHYTHM DUEL**로 표시합니다. `web/game/title.mjs`에서 바꾼 뒤 다시 빌드하세요.

## 실행

- Mac에서는 `dist/RhythmDuel.html`을 Chrome이나 Edge로 엽니다. Supabase 연결 없이도 연주하고 이 브라우저의 팀 점수판을 볼 수 있습니다.
- Windows x64에서는 `dist/RhythmDuel.exe`를 엽니다. Windows에 설치된 Edge 또는 Chrome의 앱 창을 띄웁니다. 게임과 음원은 EXE에 들어 있습니다.
- ESP32 두 대를 게임 PC에 연결합니다. P1은 위 Q/W, 아래 E/R/T를 사용합니다. P2는 위 A/S, 아래 D/F/G를 사용합니다.
- 메뉴에서 P1의 Q/W로 이동, E로 선택, R로 뒤로, T로 팀 점수판을 엽니다. 게임 중 Esc로 일시정지하거나 재개합니다.
- 캐릭터가 시범을 보여주면 장애물이 판정선에 닿을 때 표시된 버튼을 누르세요. P1과 P2가 번갈아 진행합니다. 키를 누르면 판정과 관계없이 동작과 효과음이 나옵니다. PERFECT는 만점, GOOD은 그 판정의 65%를 얻습니다. 플레이어별 최종 점수는 곡에 관계없이 16,000점 만점이며, 팀 순위는 두 점수의 합계로 정합니다.
- 세 MP3를 처음부터 끝까지 재생합니다. 전체 음원에서 주박을 추적한 채보를 사용하고, 음악과 시범 효과음은 같은 Web Audio 클록에서 재생합니다.

## 축제 운영 연결

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 프로젝트를 만들고 SQL Editor에서 `supabase/festival.sql`을 실행합니다.
2. Authentication → Users에서 운영자 이메일 계정과 게임 PC 이메일 계정을 각각 만들고 확인 상태를 켭니다. 두 계정의 이메일을 아래에 대입해 SQL Editor에서 실행합니다.

   ```sql
   insert into public.festival_users(user_id, role)
   select id, case when email = 'operator@example.com' then 'admin' else 'station' end
   from auth.users
   where email in ('operator@example.com', 'game-pc@example.com')
   on conflict (user_id) do update set role = excluded.role;
   ```

3. 휴대폰에서 [GitHub Pages 관리자 화면](https://minchan012309-spec.github.io/rg/operator-web/)을 엽니다. 다른 저장소에 배포하려면 Pages의 배포 대상을 `main` 루트로 설정합니다.
4. 게임의 **운영 연결**에는 프로젝트 URL, Publishable 키, 게임 PC 계정으로 로그인합니다. 휴대폰 관리자 페이지에서는 같은 URL과 Publishable 키, 운영자 계정으로 로그인합니다.
5. 휴대폰에서 팀명과 두 사람의 학번·이름을 저장합니다. 곡을 보내면 게임 PC가 캐릭터 선택 화면을 엽니다. 현장에서 캐릭터를 직접 선택하거나, 관리자가 게임 시작을 누르면 현재 캐릭터로 바로 시작합니다. 재생 제한이 있는 브라우저에서는 게임 PC의 선택 버튼으로 시작하세요.
6. 결과가 저장되면 휴대폰에서 해당 경기의 두 점수를 수정할 수 있습니다. 게임 PC에서 점수판을 다시 열면 변경된 순위를 읽습니다.

프로젝트 URL과 Publishable 키는 두 화면에 입력합니다. 비밀번호는 각 로그인 화면에 입력합니다. 학번은 관리자 권한으로 읽는 운영 데이터에 보관되고, 팀 점수판에는 팀명과 점수가 표시됩니다. 연결 전에 진행한 로컬 경기는 해당 PC의 로컬 점수판에 저장됩니다. 서버 운영은 게임 PC 한 대를 기준으로 합니다.

## 다시 빌드

이 저장소에는 실행 파일이나 MP3를 커밋하지 않습니다. 받은 MP3 3개를 순서대로 `festival/web/game/audio/bgm1.mp3`, `bgm2.mp3`, `bgm3.mp3`로 복사하세요. 동봉된 채보를 그대로 사용할 수 있습니다.

- 브라우저용 HTML: `python3 festival/build-web.py`
- Windows x64 EXE: `./festival/build-windows.sh` (Go 1.24 이상)
- 채보 재생성: `python3 festival/make_charts.py "game bgm1.mp3" "game bgm2.mp3" "game bgm3.mp3"` (FFmpeg, NumPy, SciPy)
- 판정 검사: `node --test festival/tests/*.test.mjs`

Mona12와 Bithumb Gothic Original은 요청한 CDN 주소를 사용합니다. 주소에 접속할 수 없을 때는 운영체제 글꼴로 표시합니다.
