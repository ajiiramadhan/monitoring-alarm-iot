const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

async function getAlerts(req, res) {
  const { severity, unread, limit=50 } = req.query;
  const conds = []; const params = [];
  if (severity) { params.push(severity); conds.push(`severity=$${params.length}`); }
  if (unread==='true') conds.push('is_read=FALSE');
  params.push(parseInt(limit));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const r = await query(`SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

const createRules = [
  body('sensor_type').notEmpty(),
  body('message').notEmpty(),
  body('severity').optional().isIn(['info','warning','high','critical']),
];

async function createAlert(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { sensor_type, message, severity='warning' } = req.body;
  try {
    const r = await query(`INSERT INTO alerts (sensor_type,message,severity) VALUES($1,$2,$3) RETURNING *`, [sensor_type, message, severity]);
    const io = req.app.get('io');
    if (io) io.emit('alert:new', r.rows[0]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

async function markRead(req, res) {
  try {
    const r = await query(`UPDATE alerts SET is_read=TRUE WHERE id=$1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Alert tidak ditemukan' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { getAlerts, createAlert, markRead, createRules };
