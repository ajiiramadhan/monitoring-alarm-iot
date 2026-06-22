/* settings.js — Settings page: MQTT config, alert thresholds, topics, user management */
(function () {
  'use strict';
  API.requireAuth();
  API.requireRole('admin');
  const user = API.getUser();

  document.getElementById('topbarUsername').textContent = user.username;
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault(); try { await API.post('/auth/logout', {}); } catch {}
    API.clearSession(); location.href = '/login';
  });

  const form = document.getElementById('settingsForm');
  const saveAlert = document.getElementById('saveAlert');

  function showSaveAlert(message, type) {
    saveAlert.className = `alert alert-${type}`;
    saveAlert.textContent = message;
    saveAlert.classList.remove('d-none');
    setTimeout(() => saveAlert.classList.add('d-none'), 4000);
  }

  /* ── Load current settings into form ── */
  async function loadSettings() {
    try {
      const res = await API.get('/settings');
      const s = res.data;
      const map = {
        mqtt_host: 'mqtt_host', mqtt_port: 'mqtt_port', mqtt_ws_port: 'mqtt_ws_port',
        refresh_rate: 'refresh_rate', alert_temp_max: 'alert_temp_max', alert_dist_min: 'alert_dist_min',
        topic_beam: 'topic_beam', topic_pir: 'topic_pir', topic_ultrasonic: 'topic_ultrasonic',
        topic_dht11: 'topic_dht11', topic_buzzer: 'topic_buzzer',
      };
      Object.entries(map).forEach(([formName, key]) => {
        const el = form.querySelector(`[name="${formName}"]`);
        if (el && s[key] !== undefined) el.value = s[key];
      });
    } catch (e) { console.error('[Settings] load error', e); showSaveAlert('Gagal memuat settings: ' + e.message, 'danger'); }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...';

    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) payload[k] = v;

    try {
      await API.put('/settings', payload);
      showSaveAlert('Settings berhasil disimpan.', 'success');
    } catch (err) {
      showSaveAlert('Gagal menyimpan: ' + err.message, 'danger');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-1"></i> Simpan Settings';
    }
  });

  /* ── User management ── */
  function roleBadge(role) {
    const map = { admin: 'badge-danger', operator: 'badge-warning', viewer: 'badge-info' };
    return `<span class="badge-pill-soft ${map[role]||'badge-info'}">${role}</span>`;
  }

  async function loadUsers() {
    const tbody = document.getElementById('usersBody');
    try {
      const res = await API.get('/users');
      tbody.innerHTML = '';
      if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada user</td></tr>'; return; }
      res.data.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-weight-bold">${u.username}</td>
          <td>${u.email}</td>
          <td>${roleBadge(u.role)}</td>
          <td>${u.is_active ? '<span class="badge-pill-soft badge-normal">Aktif</span>' : '<span class="badge-pill-soft badge-danger">Nonaktif</span>'}</td>
          <td>
            <button class="btn-action ${u.is_active?'danger':''}" data-toggle-id="${u.id}" data-active="${u.is_active}">
              ${u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button class="btn-action danger ml-1" data-delete-id="${u.id}" ${u.id===user.id?'disabled style="opacity:.4;cursor:not-allowed;"':''}>Hapus</button>
          </td>`;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('[data-toggle-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.toggleId;
          const newActive = btn.dataset.active !== 'true';
          try { await API.put(`/users/${id}`, { is_active: newActive }); loadUsers(); }
          catch (e) { showSaveAlert('Gagal mengubah status: ' + e.message, 'danger'); }
        });
      });
      tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (btn.disabled) return;
          if (!confirm('Hapus user ini secara permanen?')) return;
          try { await API.del(`/users/${btn.dataset.deleteId}`); loadUsers(); }
          catch (e) { showSaveAlert('Gagal menghapus: ' + e.message, 'danger'); }
        });
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${e.message}</td></tr>`;
    }
  }

  document.getElementById('addUserBtn').addEventListener('click', async () => {
    const errorBox = document.getElementById('addUserError');
    errorBox.classList.add('d-none');
    const username = document.getElementById('newUsername').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    try {
      await API.post('/users', { username, email, password, role });
      $('#addUserModal').modal('hide');
      document.getElementById('newUsername').value = '';
      document.getElementById('newEmail').value = '';
      document.getElementById('newPassword').value = '';
      loadUsers();
    } catch (e) {
      errorBox.textContent = e.message;
      errorBox.classList.remove('d-none');
    }
  });

  loadSettings();
  loadUsers();
})();
