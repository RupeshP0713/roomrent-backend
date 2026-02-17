const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, messageController.sendMessage);
router.get('/conversation/:userId?/:userRole?', authMiddleware, messageController.getMessages);
router.put('/read', authMiddleware, messageController.markAsRead);
router.get('/unread-count', authMiddleware, messageController.getUnreadCount);

module.exports = router;
