const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/login', adminController.login);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), adminController.getStats);
router.get('/users', authMiddleware, roleMiddleware(['admin']), adminController.getUsers);
router.delete('/users/:role/:id', authMiddleware, roleMiddleware(['admin']), adminController.deleteUser);
router.get('/transactions', authMiddleware, roleMiddleware(['admin']), adminController.getTransactions);

module.exports = router;

