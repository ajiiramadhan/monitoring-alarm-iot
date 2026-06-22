const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');

async function getUsers(req, res) {
  try {
    const r = await query(`SELECT id,username,email,role,is_active,last_login,created_at FROM users ORDER BY created_at DESC`);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

const createRules = [
  body('username').trim().isLength({ min:3, max:50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min:6 }),
  body('role').optional().isIn(['admin','operator','viewer']),
];

async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { username, email, password, role='viewer' } = req.body;
  try {
    const exists = await query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Username/email sudah dipakai' });
    const hash = await bcrypt.hash(password, 10);
    const r = await query(`INSERT INTO users (username,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,username,email,role,is_active,created_at`, [username, email, hash, role]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

const updateRules = [
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin','operator','viewer']),
  body('is_active').optional().isBoolean(),
  body('password').optional().isLength({ min:6 }),
];

async function updateUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { id } = req.params;
  const { email, role, is_active, password } = req.body;
  const fields = []; const params = [];
  if (email      !== undefined) { params.push(email);      fields.push(`email=$${params.length}`); }
  if (role       !== undefined) { params.push(role);       fields.push(`role=$${params.length}`); }
  if (is_active  !== undefined) { params.push(is_active);  fields.push(`is_active=$${params.length}`); }
  if (password) { const h = await bcrypt.hash(password,10); params.push(h); fields.push(`password_hash=$${params.length}`); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'Tidak ada field untuk diupdate' });
  params.push(id);
  try {
    const r = await query(`UPDATE users SET ${fields.join(',')} WHERE id=$${params.length} RETURNING id,username,email,role,is_active,created_at`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

async function deleteUser(req, res) {
  try {
    if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri' });
    const r = await query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, message: 'User dihapus' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { getUsers, createUser, updateUser, deleteUser, createRules, updateRules };
