const router = require('express').Router();
const c = require('../controllers/buzzerController');
const { authMiddleware, requireRole } = require('../middleware/auth');
router.get('/logs',     authMiddleware, c.getLogs);
router.post('/control', authMiddleware, requireRole('admin','operator'), c.control);
module.exports = router;
