// Thin API client. All user input is rendered via textContent / DOM helpers
// (never innerHTML) elsewhere in the app, so XSS isn't reachable via these calls.

(function () {
  const BASE = window.RANKED_CONFIG.API_BASE;
  const ACCESS_KEY = 'ranked.accessToken';
  const REFRESH_KEY = 'ranked.refreshToken';
  const USER_KEY = 'ranked.user';

  function getAccess() { return localStorage.getItem(ACCESS_KEY); }
  function getRefresh() { return localStorage.getItem(REFRESH_KEY); }

  function setSession(payload) {
    if (!payload) return;
    if (payload.accessToken) localStorage.setItem(ACCESS_KEY, payload.accessToken);
    if (payload.refreshToken) localStorage.setItem(REFRESH_KEY, payload.refreshToken);
    if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }

  function clearSession() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }

  async function request(path, options = {}, retry = true) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const access = getAccess();
    if (access && !options.noAuth) headers.Authorization = `Bearer ${access}`;

    const res = await fetch(BASE + path, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401 && retry && !options.noAuth && getRefresh()) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(path, options, false);
      clearSession();
    }

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error(data?.error || `http_${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function tryRefresh() {
    const refreshToken = getRefresh();
    if (!refreshToken) return false;
    try {
      const data = await request(
        '/auth/refresh',
        { method: 'POST', body: { refreshToken }, noAuth: true },
        false,
      );
      setSession(data);
      return true;
    } catch {
      return false;
    }
  }

  window.api = {
    isLoggedIn: () => !!getAccess(),
    user: getStoredUser,
    clearSession,
    setSession,

    register: (data) => request('/auth/register', { method: 'POST', body: data, noAuth: true })
      .then((r) => { setSession(r); return r; }),

    login: (data) => request('/auth/login', { method: 'POST', body: data, noAuth: true })
      .then((r) => { setSession(r); return r; }),

    logout: async () => {
      try { await request('/auth/logout', { method: 'POST' }); } catch {}
      clearSession();
    },

    me: () => request('/auth/me'),

    redeemLink: (code) => request('/link/redeem', { method: 'POST', body: { code } }),
    unlink: () => request('/link/', { method: 'DELETE' }),

    leaderboard: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('/leaderboard' + (qs ? '?' + qs : ''), { noAuth: true });
    },
    modes: () => request('/leaderboard/modes', { noAuth: true }),
    player: (identifier) =>
      request('/players/' + encodeURIComponent(identifier), { noAuth: true }),
    eloHistory: (identifier) =>
      request('/players/' + encodeURIComponent(identifier) + '/elo-history', { noAuth: true }),
  };
})();
