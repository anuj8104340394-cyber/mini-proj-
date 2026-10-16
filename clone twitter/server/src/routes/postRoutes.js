const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  createPost,
  editPost,
  deletePost,
  toggleLike,
  getFollowingPosts,
  getPostsByHashtag,
  getComplaints,
  updateComplaintStatus,
  retryBmcIntegration,
  handleBmcResolutionSync
} = require('../controllers/postController');
const {
  getComments,
  createComment
} = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');
const verifyServiceKey = require('../middleware/serviceAuth');
const upload = require('../middleware/upload');

// Backend-to-backend BMC resolution webhook (authenticated via X-Service-Key)
router.post('/bmc-resolve', verifyServiceKey, handleBmcResolutionSync);
router.post('/bmc-sync-resolution', verifyServiceKey, handleBmcResolutionSync);

// Posts
router.get('/', optionalAuth, getPosts);
router.get('/following', protect, getFollowingPosts);
router.get('/complaints', optionalAuth, getComplaints);
router.get('/tag/:tag', optionalAuth, getPostsByHashtag);
router.post('/', protect, upload.single('image'), createPost);
router.get('/:id', optionalAuth, getPostById);
router.put('/:id', protect, editPost);
router.patch('/:id/status', protect, updateComplaintStatus);
router.post('/:id/retry-bmc', protect, retryBmcIntegration);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, toggleLike);

// Post Comments
router.get('/:id/comments', getComments);
router.post('/:id/comments', protect, createComment);

module.exports = router;
