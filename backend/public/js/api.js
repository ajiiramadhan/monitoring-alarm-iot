/* api.js — Shared API helper with JWT auth */
const API = (() => {
  const BASE = '/api';
  const getToken = () => localStorage.getItem('iot_token');
  const getUser  = () => { try { return JSON.parse(localStorage.getItem('iot_user') || 'null'); } catch { return null; } };
  const setSession = (token, user) => { localStorage.setItem('iot_token', token); localStorage.setItem('iot_user', JSON.stringify(user)); };
  const clearSession = () => { localStorage.removeItem('iot_token'); localStorage.removeItem('iot_user'); };
  const isLoggedIn = () => !!getToken();

  async function request(path, options = {}) {
    const headers = { 'Content-Type':'application/json', ...(options.headers||{}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE + path, { ...options, headers });
    if (res.status === 401) {
      clearSession();
      if (!location.pathname.includes('login')) location.href = '/login';
      throw new Error('Unauthorized');
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return res; // file download
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Request error');
    return data;
  }

  const get  = (path) => request(path, { method:'GET' });
  const post = (path, body) => request(path, { method:'POST', body:JSON.stringify(body) });
  const put  = (path, body) => request(path, { method:'PUT',  body:JSON.stringify(body) });
  const del  = (path) => request(path, { method:'DELETE' });

  async function download(path, filename) {
    const res = await request(path, { method:'GET' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const requireAuth = () => { if (!isLoggedIn()) location.href = '/login'; };
  const requireRole = (...roles) => { const u = getUser(); if (!u || !roles.includes(u.role)) location.href = '/'; };

  return { get, post, put, del, download, getToken, getUser, setSession, clearSession, isLoggedIn, requireAuth, requireRole };
})();
