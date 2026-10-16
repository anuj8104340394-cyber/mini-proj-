const express = require('express');
const router = express.Router();
const { deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.delete('/:id', protect, deleteComment);

module.exports = router;
