const router = require('express').Router();
const c = require('../controllers/settingsController');
const { authMiddleware, requireRole } = require('../middleware/auth');
router.get('/', authMiddleware, c.getSettings);
router.put('/', authMiddleware, requireRole('admin'), c.updateSettings);
module.exports = router;
