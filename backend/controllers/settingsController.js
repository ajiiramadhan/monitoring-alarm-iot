const { query } = require('../config/database');

async function getSettings(req, res) {
  try {
    const r = await query('SELECT key,value,description,updated_at FROM settings ORDER BY key');
    const obj = {}; r.rows.forEach(row => { obj[row.key] = row.value; });
    res.json({ success: true, data: obj, raw: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

async function updateSettings(req, res) {
  const entries = Object.entries(req.body || {});
  if (!entries.length) return res.status(400).json({ success: false, message: 'Tidak ada data' });
  try {
    for (const [key, value] of entries) {
      await query(`INSERT INTO settings (key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2,updated_at=NOW()`, [key, String(value)]);
    }
    const r = await query('SELECT key,value FROM settings ORDER BY key');
    const obj = {}; r.rows.forEach(row => { obj[row.key] = row.value; });
    res.json({ success: true, data: obj });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { getSettings, updateSettings };
