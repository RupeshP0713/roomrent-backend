const express = require('express');
const router = express.Router();
const malikController = require('../controllers/malikController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', malikController.registerMalik);
router.post('/login', malikController.loginMalik);

router.get('/:id', authMiddleware, malikController.getMalikById);
router.put('/:id/address', authMiddleware, malikController.updateMalikAddress);
router.put('/:id', authMiddleware, malikController.updateMalik);
router.get('/:id/bhadots', authMiddleware, malikController.getMalikBhadots);
router.post('/request', authMiddleware, malikController.createRentRequest);
router.get('/:id/requests', authMiddleware, malikController.getMalikRequests);

module.exports = router;

