/* dashboard.js — Realtime dashboard with Socket.IO + REST API */
(function () {
  'use strict';
  API.requireAuth();
  const user = API.getUser();

  /* ── Topbar ── */
  document.getElementById('topbarUsername').textContent = user.username;
  document.getElementById('topbarRole').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
  if (user.role === 'admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  if (user.role === 'viewer') { document.getElementById('buzzerOnBtn').style.display = 'none'; document.getElementById('buzzerOffBtn').style.display = 'none'; }

  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault(); try { await API.post('/auth/logout', {}); } catch {}
    API.clearSession(); location.href = '/login';
  });

  /* ── Toast ── */
  function showToast(message, severity = 'info') {
    const el = document.createElement('div');
    el.className = `app-toast ${severity}`;
    el.innerHTML = `<strong class="text-uppercase small">${severity}</strong><div class="mt-1">${message}</div>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }

  /* ── Mini bar charts ── */
  const miniData  = { beam: [], pir: [], ultrasonic: [] };
  const miniColor = { beam: 'bar-primary', pir: 'bar-warning', ultrasonic: 'bar-info' };
  const miniEl    = { beam: 'beamChart', pir: 'pirChart', ultrasonic: 'ultraChart' };

  function renderMini(type) {
    const el = document.getElementById(miniEl[type]); if (!el) return;
    const vals = miniData[type]; const max = Math.max(...vals, 1);
    el.innerHTML = vals.map(v => `<div class="bar ${miniColor[type]}" style="height:${Math.max(4,Math.round(v/max*100))}%"></div>`).join('');
  }
  function pushMini(type, val) {
    miniData[type].push(Number(val)||0);
    if (miniData[type].length > 12) miniData[type].shift();
    renderMini(type);
  }

  /* ── Sensor cards ── */
  function updateSensorCard(type, val) {
    const v = Number(val);
    if (type === 'beam') {
      document.getElementById('beamStatus').textContent = v===1 ? 'TERPUTUS' : 'NORMAL';
      document.getElementById('beamStatus').className   = `font-weight-bold text-${v===1?'danger':'success'}`;
      document.getElementById('beamBadge').className    = `badge-pill-soft badge-${v===1?'danger':'normal'}`;
      document.getElementById('beamBadge').innerHTML    = v===1 ? '<i class="fas fa-exclamation-circle"></i> INTRUSI' : '<i class="fas fa-check-circle"></i> AMAN';
    } else if (type === 'pir') {
      document.getElementById('pirStatus').textContent = v===1 ? 'GERAKAN TERDETEKSI' : 'TIDAK ADA';
      document.getElementById('pirStatus').className   = `font-weight-bold text-${v===1?'warning':'success'}`;
      document.getElementById('pirBadge').className    = `badge-pill-soft badge-${v===1?'warning':'normal'}`;
      document.getElementById('pirBadge').innerHTML    = v===1 ? '<i class="fas fa-walking"></i> AKTIF' : '<i class="fas fa-check-circle"></i> AMAN';
    } else if (type === 'ultrasonic') {
      document.getElementById('ultraStatus').textContent = `${v} cm`;
      document.getElementById('ultraStatus').className   = 'font-weight-bold text-info';
      const close = v < 20;
      document.getElementById('ultraBadge').className = `badge-pill-soft badge-${close?'danger':'normal'}`;
      document.getElementById('ultraBadge').innerHTML = close ? '<i class="fas fa-search"></i> SANGAT DEKAT' : '<i class="fas fa-check-circle"></i> AMAN';
    }
    pushMini(type, v);
  }

  /* ── DHT11 ── */
  let dhtChart = null; let currentRange = '1h';

  function updateDhtSummary(d) {
    document.getElementById('dhtSuhu').textContent     = `${d.temperature}°C`;
    document.getElementById('dhtKelembapan').textContent = `${d.humidity}%`;
    document.getElementById('dhtHeatIndex').textContent  = `${d.heat_index ?? '--'}°C`;
    document.getElementById('dhtSensorStatus').textContent = 'AKTIF';
    document.getElementById('dhtLastUpdate').textContent   = new Date(d.created_at).toLocaleTimeString('id-ID');
    document.getElementById('kpiTemp').textContent    = `${d.temperature} °C`;
    document.getElementById('kpiHumidity').textContent = `${d.humidity} %`;
  }

  function kondisiBadge(t, h) {
    return (t >= 35 || h >= 80)
      ? '<span class="badge-pill-soft badge-danger">Panas &amp; Lembab</span>'
      : '<span class="badge-pill-soft badge-normal">Normal</span>';
  }

  function renderDhtTable(rows) {
    const tbody = document.getElementById('dhtBody'); tbody.innerHTML = '';
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada data</td></tr>'; return; }
    [...rows].reverse().slice(0, 8).forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="font-family:monospace;font-size:11px;">${new Date(d.created_at).toLocaleTimeString('id-ID')}</td><td class="font-weight-bold text-danger">${d.temperature}°C</td><td class="font-weight-bold text-primary">${d.humidity}%</td><td class="font-weight-bold text-warning">${d.heat_index??'-'}°C</td><td>${kondisiBadge(Number(d.temperature),Number(d.humidity))}</td>`;
      tbody.appendChild(tr);
    });
  }

  function prependDhtRow(d) {
    const tbody = document.getElementById('dhtBody');
    if (tbody.children[0] && tbody.children[0].cells.length === 1) tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="font-family:monospace;font-size:11px;">${new Date(d.created_at).toLocaleTimeString('id-ID')}</td><td class="font-weight-bold text-danger">${d.temperature}°C</td><td class="font-weight-bold text-primary">${d.humidity}%</td><td class="font-weight-bold text-warning">${d.heat_index??'-'}°C</td><td>${kondisiBadge(Number(d.temperature),Number(d.humidity))}</td>`;
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 8) tbody.removeChild(tbody.lastChild);
  }

  function renderDhtChart(rows) {
    const labels = rows.map(r => new Date(r.created_at).toLocaleTimeString('id-ID'));
    const temps  = rows.map(r => Number(r.temperature));
    const hums   = rows.map(r => Number(r.humidity));
    if (dhtChart) {
      dhtChart.data.labels = labels;
      dhtChart.data.datasets[0].data = temps;
      dhtChart.data.datasets[1].data = hums;
      dhtChart.update(); return;
    }
    const ctx = document.getElementById('dhtChart').getContext('2d');
    dhtChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Suhu (°C)',       data:temps, borderColor:'#e74a3b', backgroundColor:'rgba(231,74,59,.1)',  tension:.3, yAxisID:'y'  },
          { label:'Kelembapan (%)',  data:hums,  borderColor:'#4e73df', backgroundColor:'rgba(78,115,223,.1)', tension:.3, yAxisID:'y1' },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        scales: {
          y:  { type:'linear', position:'left',  title:{ display:true, text:'°C' } },
          y1: { type:'linear', position:'right', title:{ display:true, text:'%'  }, grid:{ drawOnChartArea:false } },
        },
      },
    });
  }

  async function loadDhtHistory(range) {
    currentRange = range;
    try {
      const res = await API.get(`/sensors/history?type=dht11&range=${range}&limit=120`);
      renderDhtChart(res.data);
      renderDhtTable(res.data);
    } catch (e) { console.error('[DHT History]', e); }
  }

  document.querySelectorAll('#dhtRangeGroup button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dhtRangeGroup button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadDhtHistory(btn.dataset.range);
    });
  });

  /* ── Buzzer log ── */
  function tagClass(t) { return { beam:'tag-beam', pir:'tag-pir', ultrasonic:'tag-ultrasonic', manual:'tag-manual' }[t] || 'tag-manual'; }

  function prependBuzzerRow(row) {
    const tbody = document.getElementById('logBody');
    if (tbody.children[0] && tbody.children[0].cells.length === 1) tbody.innerHTML = '';
    const dur  = row.duration_ms ? (row.duration_ms/1000).toFixed(1)+' s' : '-';
    const trig = row.sensor_trigger || 'manual';
    const tr   = document.createElement('tr');
    tr.innerHTML = `<td style="font-family:monospace;font-size:11px;">${new Date(row.created_at).toLocaleTimeString('id-ID')}</td><td><span class="${tagClass(trig)}"><i class="fas fa-bolt mr-1"></i>${trig}</span></td><td><span class="${row.status==='ON'?'pill-on':'pill-off'}">${row.status}</span></td><td>${dur}</td><td>${row.message||'-'}</td>`;
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 15) tbody.removeChild(tbody.lastChild);
  }

  async function loadBuzzerLogs() {
    try {
      const res = await API.get('/buzzer/logs?limit=15');
      const tbody = document.getElementById('logBody'); tbody.innerHTML = '';
      if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada log</td></tr>'; return; }
      res.data.forEach(prependBuzzerRow);
    } catch (e) { console.error('[Buzzer Logs]', e); }
  }

  document.getElementById('buzzerOnBtn').addEventListener('click', () => buzzerControl('ON'));
  document.getElementById('buzzerOffBtn').addEventListener('click', () => buzzerControl('OFF'));
  async function buzzerControl(status) {
    try { await API.post('/buzzer/control', { status }); showToast(`Buzzer ${status==='ON'?'diaktifkan':'dimatikan'}`, 'info'); }
    catch (e) { showToast(e.message, 'critical'); }
  }

  /* ── Alerts ── */
  function sevBadge(s) {
    const map = { info:'badge-info', warning:'badge-warning', high:'badge-high', critical:'badge-danger' };
    return `<span class="badge-pill-soft ${map[s]||'badge-info'}">${s.toUpperCase()}</span>`;
  }

  function prependAlertRow(a) {
    const tbody = document.getElementById('alertBody');
    if (tbody.children[0] && tbody.children[0].cells.length === 1) tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="font-family:monospace;font-size:11px;">${new Date(a.created_at).toLocaleString('id-ID')}</td><td class="text-uppercase small font-weight-bold">${a.sensor_type}</td><td>${a.message}</td><td>${sevBadge(a.severity)}</td><td>${a.is_read?'<span class="badge-pill-soft badge-normal">Dibaca</span>':'<span class="badge-pill-soft badge-warning">Baru</span>'}</td>`;
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 15) tbody.removeChild(tbody.lastChild);
  }

  function updateAlertDropdown(alerts) {
    const list = document.getElementById('alertDropdownList');
    if (!alerts.length) { list.innerHTML = '<div class="text-center text-muted small p-3">Tidak ada alert</div>'; return; }
    list.innerHTML = alerts.slice(0,5).map(a => {
      const col = { critical:'danger', high:'danger', warning:'warning', info:'info' }[a.severity] || 'info';
      return `<a class="dropdown-item d-flex align-items-center" href="#alertRow"><div class="mr-3"><div class="icon-circle bg-${col}"><i class="fas fa-exclamation-triangle text-white"></i></div></div><div><div class="small text-gray-500">${new Date(a.created_at).toLocaleString('id-ID')}</div><span class="font-weight-bold">${a.message}</span></div></a>`;
    }).join('');
  }

  let unreadCount = 0;
  function setAlertBadge(n) {
    unreadCount = n;
    document.getElementById('alertBadge').textContent = n;
    document.getElementById('kpiAlerts').textContent  = n;
  }

  async function loadAlerts() {
    try {
      const res = await API.get('/alerts?limit=15');
      const tbody = document.getElementById('alertBody'); tbody.innerHTML = '';
      if (!res.data.length) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada alert</td></tr>';
      else res.data.forEach(prependAlertRow);
      updateAlertDropdown(res.data);
      const unread = await API.get('/alerts?unread=true&limit=99');
      setAlertBadge(unread.data.length);
    } catch (e) { console.error('[Alerts]', e); }
  }

  /* ── Device status ── */
  function setDeviceStatus(status, lastSeen) {
    const isOnline = status === 'online';
    document.getElementById('devDot').className  = `status-dot ${isOnline?'online':'offline'}`;
    document.getElementById('devText').textContent = isOnline ? 'Perangkat Online' : 'Perangkat Offline';
    document.getElementById('kpiDevice').textContent  = isOnline ? 'ONLINE' : 'OFFLINE';
    document.getElementById('kpiDevice').className    = `h5 mb-0 font-weight-bold text-${isOnline?'success':'danger'}`;
    if (lastSeen) document.getElementById('kpiDeviceSeen').textContent = `Last seen: ${new Date(lastSeen).toLocaleString('id-ID')}`;
  }

  /* ── Initial load ── */
  async function loadInitial() {
    try {
      const res = await API.get('/sensors/latest');
      const { sensors, dht11, devices, unread_alerts } = res.data;
      sensors.forEach(s => updateSensorCard(s.sensor_type, s.value));
      if (dht11) updateDhtSummary(dht11);
     const targetDevice = devices.find(d => d.device_id === 'esp32-001') || devices[0];
     if (targetDevice) setDeviceStatus(targetDevice.status, targetDevice.last_seen);
      else setDeviceStatus('offline', null);
      setAlertBadge(unread_alerts || 0);
    } catch (e) { console.error('[Initial Load]', e); }

    await loadDhtHistory(currentRange);
    await loadBuzzerLogs();
    await loadAlerts();
  }

  loadInitial();

  /* ── Realtime via Socket.IO ── */
  const socket = io();
  socket.on('connect',       () => console.log('[Socket.IO] connected'));
  socket.on('sensor:update', (m) => updateSensorCard(m.type, m.data.value));
  socket.on('dht11:update',  (d) => {
    updateDhtSummary(d);
    prependDhtRow(d);
    if (currentRange === '1h' && dhtChart) {
      dhtChart.data.labels.push(new Date(d.created_at).toLocaleTimeString('id-ID'));
      dhtChart.data.datasets[0].data.push(Number(d.temperature));
      dhtChart.data.datasets[1].data.push(Number(d.humidity));
      if (dhtChart.data.labels.length > 60) { dhtChart.data.labels.shift(); dhtChart.data.datasets[0].data.shift(); dhtChart.data.datasets[1].data.shift(); }
      dhtChart.update();
    }
  });
  socket.on('buzzer:update', (r) => prependBuzzerRow(r));
  socket.on('alert:new',     (a) => { prependAlertRow(a); setAlertBadge(unreadCount+1); updateAlertDropdown([a]); showToast(a.message, a.severity); });
  socket.on('device:status', (i) => setDeviceStatus(i.status, i.last_seen));
})();
