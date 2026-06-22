const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query }  = require('../config/database');
const config     = require('../config');

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
];
const registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin','operator','viewer']),
];

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { username, password } = req.body;
  try {
    const r = await query('SELECT * FROM users WHERE username=$1 AND is_active=TRUE', [username]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    await query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    res.json({ success: true, token: signToken(user), user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) { console.error('[Auth] login:', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { username, email, password, role = 'viewer' } = req.body;
  try {
    const exists = await query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Username/email sudah dipakai' });
    const hash = await bcrypt.hash(password, 10);
    const r = await query(
      'INSERT INTO users (username,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,username,email,role,created_at',
      [username, email, hash, role]
    );
    res.status(201).json({ success: true, user: r.rows[0] });
  } catch (err) { console.error('[Auth] register:', err); res.status(500).json({ success: false, message: 'Server error' }); }
}

async function logout(req, res) {
  res.json({ success: true, message: 'Logout berhasil' });
}

async function getProfile(req, res) {
  try {
    const r = await query('SELECT id,username,email,role,last_login,created_at FROM users WHERE id=$1', [req.user.id]);
    res.json({ success: true, user: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
}

module.exports = { login, register, logout, getProfile, loginRules, registerRules };
