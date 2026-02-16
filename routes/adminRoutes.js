const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', adminController.login);
router.get('/stats', authMiddleware, adminController.getStats);
router.get('/users', authMiddleware, adminController.getUsers);
router.delete('/users/:role/:id', authMiddleware, adminController.deleteUser);
router.get('/transactions', authMiddleware, adminController.getTransactions);

module.exports = router;

