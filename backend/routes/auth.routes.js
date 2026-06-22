const router = require('express').Router();
const c = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
router.post('/login',    authLimiter, c.loginRules,    c.login);
router.post('/logout',   authMiddleware, c.logout);
router.post('/register', authMiddleware, requireRole('admin'), c.registerRules, c.register);
router.get('/profile',   authMiddleware, c.getProfile);
module.exports = router;
