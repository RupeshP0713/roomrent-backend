const express = require('express');
const router = express.Router();
const bhadotController = require('../controllers/bhadotController');
const authMiddleware = require('../middleware/authMiddleware');

const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/register', bhadotController.registerBhadot);
router.post('/login', bhadotController.loginBhadot);

router.get('/available-rooms', bhadotController.getAvailableRooms); // Public
router.get('/:id', authMiddleware, roleMiddleware(['bhadot', 'admin']), bhadotController.getBhadotById);
router.put('/:id', authMiddleware, roleMiddleware(['bhadot', 'admin']), bhadotController.updateBhadot);
router.put('/:id/active', authMiddleware, roleMiddleware(['bhadot']), bhadotController.toggleBhadotActive);
router.get('/:id/requests', authMiddleware, roleMiddleware(['bhadot', 'admin']), bhadotController.getBhadotRequests);
router.put('/request/:requestId', authMiddleware, roleMiddleware(['bhadot']), bhadotController.updateRentRequestStatus);

module.exports = router;

