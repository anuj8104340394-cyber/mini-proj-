const express = require('express');
const router = express.Router();
const {
  getUserByUsername,
  searchUsers,
  getSuggestions,
  toggleFollow,
  updateProfile,
  getFollowers,
  getFollowing
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User search & suggestions
router.get('/search', optionalAuth, searchUsers);
router.get('/suggestions', optionalAuth, getSuggestions);

// Profile update with avatar upload
router.patch('/profile', protect, upload.single('avatar'), updateProfile);

// Followers & Following lists
router.get('/:username/followers', optionalAuth, getFollowers);
router.get('/:username/following', optionalAuth, getFollowing);

// Follow / Unfollow
router.post('/:username/follow', protect, toggleFollow);

// Profile view
router.get('/:username', optionalAuth, getUserByUsername);

module.exports = router;
