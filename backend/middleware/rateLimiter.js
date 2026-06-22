const rateLimit = require('express-rate-limit');
const config    = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, max: config.rateLimit.max,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login.' },
});

module.exports = { apiLimiter, authLimiter };
