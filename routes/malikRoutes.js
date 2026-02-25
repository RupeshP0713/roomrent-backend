const express = require('express');
const router = express.Router();
const malikController = require('../controllers/malikController');
const authMiddleware = require('../middleware/authMiddleware');

const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/register', malikController.registerMalik);
router.post('/login', malikController.loginMalik);

router.get('/:id', authMiddleware, roleMiddleware(['malik', 'admin']), malikController.getMalikById);
router.put('/:id/address', authMiddleware, roleMiddleware(['malik']), malikController.updateMalikAddress);
router.put('/:id', authMiddleware, roleMiddleware(['malik', 'admin']), malikController.updateMalik);
router.get('/:id/bhadots', authMiddleware, roleMiddleware(['malik']), malikController.getMalikBhadots);
router.post('/request', authMiddleware, roleMiddleware(['malik']), malikController.createRentRequest);
router.get('/:id/requests', authMiddleware, roleMiddleware(['malik', 'admin']), malikController.getMalikRequests);

module.exports = router;

