const express = require('express');
const router = express.Router();
const bhadotController = require('../controllers/bhadotController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', bhadotController.registerBhadot);
router.post('/login', bhadotController.loginBhadot);

router.get('/available-rooms', bhadotController.getAvailableRooms); // Public
router.get('/:id', authMiddleware, bhadotController.getBhadotById);
router.put('/:id', authMiddleware, bhadotController.updateBhadot);
router.put('/:id/active', authMiddleware, bhadotController.toggleBhadotActive);
router.get('/:id/requests', authMiddleware, bhadotController.getBhadotRequests);
router.put('/request/:requestId', authMiddleware, bhadotController.updateRentRequestStatus);

module.exports = router;

