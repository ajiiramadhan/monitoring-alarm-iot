const router = require('express').Router();
const c = require('../controllers/reportsController');
const { authMiddleware } = require('../middleware/auth');
router.get('/export', authMiddleware, c.exportReport);
module.exports = router;
