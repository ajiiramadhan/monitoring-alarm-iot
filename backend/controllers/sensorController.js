const { query } = require('../config/database');

async function getLatest(req, res) {
  try {
    const sr  = await query(`SELECT DISTINCT ON (sensor_type) sensor_type,value,unit,device_id,created_at FROM sensor_readings ORDER BY sensor_type,created_at DESC`);
    const dht = await query(`SELECT * FROM dht11_readings ORDER BY created_at DESC LIMIT 1`);
    const bz  = await query(`SELECT * FROM buzzer_logs ORDER BY created_at DESC LIMIT 1`);
    const al  = await query(`SELECT COUNT(*) FROM alerts WHERE is_read=FALSE`);
    const dev = await query(`SELECT device_id,name,status,last_seen FROM devices`);
    res.json({ success: true, data: { sensors: sr.rows, dht11: dht.rows[0]||null, buzzer: bz.rows[0]||null, unread_alerts: parseInt(al.rows[0].count), devices: dev.rows } });
  } catch (err) { console.error('[Sensor] getLatest:', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

async function getHistory(req, res) {
  const { type='dht11', range='24h', limit=100 } = req.query;
  const rangeMap = { '1h':'1 hour','24h':'24 hours','7d':'7 days','30d':'30 days' };
  const interval = rangeMap[range] || '24 hours';
  try {
    let rows;
    if (type === 'dht11') {
      const r = await query(`SELECT * FROM dht11_readings WHERE created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at ASC LIMIT $1`, [parseInt(limit)]);
      rows = r.rows;
    } else {
      const r = await query(`SELECT * FROM sensor_readings WHERE sensor_type=$1 AND created_at>=NOW()-INTERVAL '${interval}' ORDER BY created_at ASC LIMIT $2`, [type, parseInt(limit)]);
      rows = r.rows;
    }
    res.json({ success: true, data: rows });
  } catch (err) { console.error('[Sensor] getHistory:', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

async function getStatistics(req, res) {
  try {
    const dht = await query(`SELECT ROUND(AVG(temperature)::numeric,2) avg_temp,ROUND(MIN(temperature)::numeric,2) min_temp,ROUND(MAX(temperature)::numeric,2) max_temp,ROUND(AVG(humidity)::numeric,2) avg_hum,COUNT(*)::int total FROM dht11_readings WHERE created_at>=NOW()-INTERVAL '24 hours'`);
    const alerts = await query(`SELECT severity,COUNT(*)::int count FROM alerts WHERE created_at>=NOW()-INTERVAL '24 hours' GROUP BY severity`);
    const buzzer = await query(`SELECT COUNT(*)::int total_triggers FROM buzzer_logs WHERE status='ON' AND created_at>=NOW()-INTERVAL '24 hours'`);
    const events = await query(`SELECT sensor_type,COUNT(*)::int events FROM sensor_readings WHERE value>0 AND created_at>=NOW()-INTERVAL '24 hours' GROUP BY sensor_type`);
    res.json({ success: true, data: { dht11: dht.rows[0], alerts: alerts.rows, buzzer: buzzer.rows[0], sensor_events: events.rows } });
  } catch (err) { console.error('[Sensor] getStats:', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { getLatest, getHistory, getStatistics };
