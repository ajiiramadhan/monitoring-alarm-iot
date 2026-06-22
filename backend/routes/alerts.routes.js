const router = require('express').Router();
const c = require('../controllers/alertsController');
const { authMiddleware, requireRole } = require('../middleware/auth');
router.get('/',         authMiddleware, c.getAlerts);
router.post('/',        authMiddleware, requireRole('admin','operator'), c.createRules, c.createAlert);
router.put('/:id/read', authMiddleware, c.markRead);
module.exports = router;
