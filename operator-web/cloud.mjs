export class FestivalCloud {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.config = JSON.parse(localStorage.getItem(storageKey) || 'null');
    this.session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  }

  async request(path, body, auth = false) {
    const headers = { 'Content-Type': 'application/json', apikey: this.config.key };
    if (auth) headers.Authorization = 'Bearer ' + this.session.access_token;
    const response = await fetch(this.config.url + path, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.msg || data.error_description || '서버 요청 실패');
    return data;
  }

  async login(url, key, email, password, probe) {
    const endpoint = new URL(url.trim());
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
        endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
      throw new Error('https://로 시작하는 Supabase 프로젝트 URL을 입력하세요.');
    }
    if (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ')) {
      throw new Error('Supabase Publishable 키를 입력하세요.');
    }
    if (key.startsWith('eyJ') && JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') {
      throw new Error('Supabase Publishable 키 또는 anon 키를 입력하세요.');
    }
    this.config = { url: endpoint.origin, key };
    try {
      this.storeSession(await this.request('/auth/v1/token?grant_type=password', { email, password }));
      await probe();
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  storeSession(session) {
    this.session = { ...session, expires: Date.now() + session.expires_in * 1000 };
    sessionStorage.setItem(this.storageKey, JSON.stringify(this.session));
  }

  async rpc(operation, payload = {}) {
    if (!this.session) throw new Error('로그인이 필요합니다.');
    if (this.session.expires - Date.now() < 60000) {
      this.refresh ??= this.request('/auth/v1/token?grant_type=refresh_token', {
        refresh_token: this.session.refresh_token,
      }).then(session => this.storeSession(session)).finally(() => { this.refresh = null; });
      await this.refresh;
    }
    return this.request('/rest/v1/rpc/festival_rpc', { operation, payload }, true);
  }

  logout() {
    this.session = null;
    sessionStorage.removeItem(this.storageKey);
  }

  fill(form) {
    form.elements.url.value = this.config?.url || '';
    form.elements.key.value = this.config?.key || '';
  }
}
