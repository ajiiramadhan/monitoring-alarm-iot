const router = require('express').Router();
const c = require('../controllers/sensorController');
const { authMiddleware } = require('../middleware/auth');
router.get('/latest',     authMiddleware, c.getLatest);
router.get('/history',    authMiddleware, c.getHistory);
router.get('/statistics', authMiddleware, c.getStatistics);
module.exports = router;
