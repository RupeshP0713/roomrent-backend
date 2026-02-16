const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/:number', searchController.searchUser);

module.exports = router;
