/* auth.js — Login page */
(function () {
  if (API.isLoggedIn()) { location.href = '/'; return; }
  const remembered = localStorage.getItem('iot_remember_user');
  if (remembered) { document.getElementById('username').value = remembered; document.getElementById('rememberMe').checked = true; }
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('loginError');
    errorBox.classList.add('d-none');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('rememberMe').checked;
    const btn = document.getElementById('loginSubmit');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memproses...';
    try {
      const data = await API.post('/auth/login', { username, password });
      API.setSession(data.token, data.user);
      if (remember) localStorage.setItem('iot_remember_user', username);
      else localStorage.removeItem('iot_remember_user');
      location.href = '/';
    } catch (err) {
      errorBox.textContent = err.message || 'Login gagal';
      errorBox.classList.remove('d-none');
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Login';
    }
  });
})();
