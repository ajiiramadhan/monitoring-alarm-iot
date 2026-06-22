const router = require('express').Router();
const c = require('../controllers/usersController');
const { authMiddleware, requireRole } = require('../middleware/auth');
router.use(authMiddleware, requireRole('admin'));
router.get('/',    c.getUsers);
router.post('/',   c.createRules, c.createUser);
router.put('/:id', c.updateRules, c.updateUser);
router.delete('/:id', c.deleteUser);
module.exports = router;
