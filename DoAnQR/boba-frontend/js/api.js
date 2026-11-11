// Lớp gọi API dùng chung: token, tự refresh, lỗi, upload ảnh
(function () {
  const BASE = window.APP_CONFIG.API_BASE;
  const K = { a: 'boba_access', r: 'boba_refresh', u: 'boba_user' };
  const store = {
    get access() { return localStorage.getItem(K.a); },
    get refresh() { return localStorage.getItem(K.r); },
    get user() { try { return JSON.parse(localStorage.getItem(K.u)); } catch { return null; } },
    set(t) { if (t.accessToken) localStorage.setItem(K.a, t.accessToken); if (t.refreshToken) localStorage.setItem(K.r, t.refreshToken); if (t.user) localStorage.setItem(K.u, JSON.stringify(t.user)); },
    clear() { Object.values(K).forEach(k => localStorage.removeItem(k)); },
  };

  class ApiError extends Error {
    constructor(status, message, errors) { super(message); this.status = status; this.errors = errors || []; }
  }

  let refreshing = null;
  async function doRefresh() {
    if (!store.refresh) throw new ApiError(401, 'Hết phiên đăng nhập');
    refreshing = refreshing || fetch(BASE + '/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: store.refresh }),
    }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new ApiError(r.status, j.message || 'Hết phiên đăng nhập');
      store.set(j.data || j);
    }).finally(() => { refreshing = null; });
    return refreshing;
  }

  async function request(path, { method = 'GET', body, query, auth = true, form = false, blob = false } = {}, retried = false) {
    const url = new URL(BASE + path);
    if (query) Object.entries(query).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
    const headers = {};
    if (auth && store.access) headers.Authorization = 'Bearer ' + store.access;
    if (body && !form) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined });
    } catch {
      throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra backend và CORS.');
    }
    if (blob && res.ok) return res.blob();
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && auth && !retried && store.refresh) {
      try { await doRefresh(); return request(path, { method, body, query, auth, form, blob }, true); }
      catch { store.clear(); location.href = 'index.html'; throw new ApiError(401, 'Hết phiên đăng nhập'); }
    }
    if (!res.ok || json.success === false) throw new ApiError(res.status, json.message || 'Có lỗi xảy ra', json.errors);
    return json;
  }

  const api = {
    store, ApiError, request,
    imageUrl: p => (!p ? '' : /^https?:/.test(p) ? p : BASE + p),
    async login(username, password) {
      const j = await request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
      store.set(j.data || j); return j.data || j;
    },
    logout() { store.clear(); location.href = 'index.html'; },
    requireLogin() { if (!store.access) { location.href = 'index.html'; return false; } return true; },
    health: () => request('/api/health', { auth: false }),
    products: {
      list: q => request('/api/products', { query: q }),
      get: id => request('/api/products/' + id),
      create: b => request('/api/products', { method: 'POST', body: b }),
      update: (id, b) => request('/api/products/' + id, { method: 'PUT', body: b }),
      hide: id => request('/api/products/' + id, { method: 'DELETE' }),
      setAvailable: (id, isAvailable) => request(`/api/products/${id}/availability`, { method: 'PATCH', body: { isAvailable } }),
      addOption: (id, b) => request(`/api/products/${id}/options`, { method: 'POST', body: b }),
      updateOption: (id, oid, b) => request(`/api/products/${id}/options/${oid}`, { method: 'PUT', body: b }),
      deleteOption: (id, oid) => request(`/api/products/${id}/options/${oid}`, { method: 'DELETE' }),
      uploadImage(id, file) { const f = new FormData(); f.append('image', file); return request(`/api/products/${id}/image`, { method: 'POST', body: f, form: true }); },
    },
    categories: {
      list: () => request('/api/categories'),
      create: b => request('/api/categories', { method: 'POST', body: b }),
      update: (id, b) => request('/api/categories/' + id, { method: 'PUT', body: b }),
      remove: id => request('/api/categories/' + id, { method: 'DELETE' }),
    },
    tables: {
      list: () => request('/api/tables'),
      create: b => request('/api/tables', { method: 'POST', body: b }),
      update: (id, b) => request('/api/tables/' + id, { method: 'PUT', body: b }),
      remove: id => request('/api/tables/' + id, { method: 'DELETE' }),
      regenToken: id => request(`/api/tables/${id}/regenerate-token`, { method: 'POST' }),
      qr: (id, size = 512) => request(`/api/tables/${id}/qr`, { query: { format: 'png', size }, blob: true }),
    },
    staff: {
      list: () => request('/api/staff'),
      create: b => request('/api/staff', { method: 'POST', body: b }),
      update: (id, b) => request('/api/staff/' + id, { method: 'PUT', body: b }),
      lock: id => request('/api/staff/' + id, { method: 'DELETE' }),
    },
    orders: {
      list: q => request('/api/orders', { query: q }),
      get: id => request('/api/orders/' + id),
      setStatus: (id, status) => request(`/api/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    },
    pub: {
      menu: token => request('/api/public/menu', { auth: false, query: { token } }),
      orders: token => request('/api/public/orders', { auth: false, query: { token } }),
      create: b => request('/api/public/orders', { method: 'POST', body: b, auth: false }),
      addItems: (id, b) => request(`/api/public/orders/${id}/items`, { method: 'POST', body: b, auth: false }),
    },
  };
  window.api = api;
})();
