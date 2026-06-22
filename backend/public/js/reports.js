/* reports.js — Export CSV/Excel/PDF for sensors, dht11, alerts, buzzer */
(function () {
  'use strict';
  API.requireAuth();
  const user = API.getUser();

  document.getElementById('topbarUsername').textContent = user.username;
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault(); try { await API.post('/auth/logout', {}); } catch {}
    API.clearSession(); location.href = '/login';
  });

  const typeLabels = { sensors: 'Sensor (Beam/PIR/Ultrasonik)', dht11: 'DHT11', alerts: 'Alerts', buzzer: 'Buzzer Log' };
  const formatExt  = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type   = btn.dataset.type;
      const range  = document.querySelector(`[data-range-for="${type}"]`).value;
      const format = btn.dataset.export;

      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      try {
        const filename = `report_${type}_${range}.${formatExt[format]}`;
        await API.download(`/reports/export?type=${type}&range=${range}&format=${format}`, filename);
        showStatus(`${typeLabels[type]} (${range}) berhasil diexport ke ${format.toUpperCase()}.`, 'success');
      } catch (e) {
        showStatus(`Gagal export: ${e.message}`, 'danger');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });
  });

  function showStatus(msg, type) {
    const box = document.getElementById('exportStatus');
    box.className = `alert alert-${type}`;
    box.textContent = msg;
    box.classList.remove('d-none');
    setTimeout(() => box.classList.add('d-none'), 5000);
  }
})();
