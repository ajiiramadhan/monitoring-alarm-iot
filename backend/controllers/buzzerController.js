const { query }  = require('../config/database');
const { publish, getClient } = require('../mqtt/mqttClient');
const config = require('../config');

async function getLogs(req, res) {
  const { limit=20 } = req.query;
  try {
    const r = await query(`SELECT * FROM buzzer_logs ORDER BY created_at DESC LIMIT $1`, [parseInt(limit)]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

async function control(req, res) {
  const { status, device_id='esp32_01' } = req.body;
  if (!['ON','OFF'].includes(status)) return res.status(400).json({ success: false, message: 'status harus ON atau OFF' });
  const published = publish(`${config.mqtt.topics.buzzer}/cmd`, { status, device_id, by: req.user.username, timestamp: new Date().toISOString() });
  try {
    const msg = `Buzzer di-${status==='ON'?'aktifkan':'matikan'} manual oleh ${req.user.username}`;
    const r = await query(`INSERT INTO buzzer_logs (status,sensor_trigger,message,device_id) VALUES($1,'manual',$2,$3) RETURNING *`, [status, msg, device_id]);
    const io = req.app.get('io');
    if (io) io.emit('buzzer:update', r.rows[0]);
    res.json({ success: true, mqtt_published: published, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { getLogs, control };
