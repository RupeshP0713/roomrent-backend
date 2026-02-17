const express = require('express');
const router = express.Router();

const adminRoutes = require('./adminRoutes');
const malikRoutes = require('./malikRoutes');
const bhadotRoutes = require('./bhadotRoutes');
const searchRoutes = require('./searchRoutes');
const messageRoutes = require('./messageRoutes');

router.use('/admin', adminRoutes);
router.use('/malik', malikRoutes);
router.use('/bhadot', bhadotRoutes);
router.use('/search', searchRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
