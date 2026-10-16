const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');
const { isCivicComplaint, processPostIntegration, syncResolutionFromBmc } = require('../services/bmcService');

// @desc    Get all posts (latest first with pagination)
// @route   GET /api/posts
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();

    const posts = await Post.find()
      .populate('author', 'name username avatar role bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const currentUserId = req.user ? req.user._id.toString() : null;

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likes = post.likes || [];
        const isLikedByMe = currentUserId
          ? likes.some((id) => id.toString() === currentUserId)
          : false;

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: commentCount,
          isLikedByMe
        };
      })
    );

    return res.status(200).json({
      success: true,
      totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page,
      posts: postsWithMeta
    });
  } catch (error) {
    console.error('Error in getPosts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name username avatar role bio')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const commentCount = await Comment.countDocuments({ post: post._id });
    const currentUserId = req.user ? req.user._id.toString() : null;
    const likes = post.likes || [];
    const isLikedByMe = currentUserId
      ? likes.some((id) => id.toString() === currentUserId)
      : false;

    return res.status(200).json({
      success: true,
      post: {
        ...post,
        likesCount: likes.length,
        commentsCount: commentCount,
        isLikedByMe
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
};

// @desc    Create a post
// @route   POST /api/posts
const createPost = async (req, res) => {
  try {
    const { text, location } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Post text cannot be empty'
      });
    }

    if (text.trim().length > 280) {
      return res.status(400).json({
        success: false,
        message: 'Post cannot exceed 280 characters'
      });
    }

    let imageUrl = '';
    let mediaType = 'none';

    if (req.file) {
      // If Cloudinary was used, req.file.path is the online HTTPS URL
      if (
        req.file.path &&
        (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))
      ) {
        imageUrl = req.file.path;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }
      mediaType = req.file.mimetype && req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    } else if (req.body.image) {
      imageUrl = req.body.image;
      mediaType = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(imageUrl) ? 'video' : 'image';
    }

    const trimmedText = text.trim();

    const post = await Post.create({
      author: req.user._id,
      text: trimmedText,
      image: imageUrl,
      mediaType,
      location: location ? location.trim() : '',
      likes: []
    });

    // Extract all unique @mentions from post text (Instagram style tag notification)
    const rawMentions = trimmedText.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedUsernames = [
      ...new Set(rawMentions.map((m) => m.slice(1).toLowerCase()))
    ];

    // Check if post mentions @bmc and qualifies as a civic complaint
    const mentionsBmc = mentionedUsernames.includes('bmc') || /@bmc\b/i.test(trimmedText);
    const qualifiesAsComplaint = mentionsBmc && isCivicComplaint(trimmedText);

    if (qualifiesAsComplaint) {
      post.isComplaint = true;
      post.integrationStatus = 'pending';
      await post.save();

      try {
        await processPostIntegration(post._id);
      } catch (bmcErr) {
        console.warn(`[postController] BMC integration deferred for post ${post._id}:`, bmcErr.message);
        // Post remains created and marked failed for subsequent retry; tweet creation is not broken
      }
    }

    if (mentionedUsernames.length > 0) {
      try {
        const taggedUsers = await User.find({
          username: { $in: mentionedUsernames },
          _id: { $ne: req.user._id }
        });

        for (const taggedUser of taggedUsers) {
          await Notification.create({
            recipient: taggedUser._id,
            sender: req.user._id,
            type: 'mention',
            post: post._id,
            message: `@${req.user.username} tagged you in a post: "${trimmedText.slice(0, 80)}..."`,
            metadata: {
              location: location || ''
            }
          });
        }
      } catch (notifyErr) {
        console.warn('Failed to notify mentioned users:', notifyErr.message);
      }
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name username avatar role bio')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        ...populatedPost,
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create post'
    });
  }
};

// @desc    Delete post (own post or admin)
// @route   DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post'
      });
    }

    // Delete image file if stored locally
    if (post.image && post.image.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', post.image);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed to delete image file:', e.message);
        }
      }
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Post and comments deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
};

// @desc    Like / Unlike a post
// @route   POST /api/posts/:id/like
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const userIdStr = req.user._id.toString();
    const isLiked = post.likes.some((id) => id.toString() === userIdStr);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter((id) => id.toString() !== userIdStr);
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();

    return res.status(200).json({
      success: true,
      isLikedByMe: !isLiked,
      likesCount: post.likes.length,
      message: isLiked ? 'Post unliked' : 'Post liked'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
};

// @desc    Edit post (author only)
// @route   PUT /api/posts/:id
const editPost = async (req, res) => {
  try {
    const { text, location } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this post'
      });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Post text cannot be empty'
      });
    }

    if (text.trim().length > 280) {
      return res.status(400).json({
        success: false,
        message: 'Post cannot exceed 280 characters'
      });
    }

    post.text = text.trim();
    if (location !== undefined) {
      post.location = location ? location.trim() : '';
    }
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name username avatar role bio')
      .lean();

    const commentCount = await Comment.countDocuments({ post: post._id });
    const likes = post.likes || [];
    const currentUserId = req.user._id.toString();
    const isLikedByMe = likes.some((id) => id.toString() === currentUserId);

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: {
        ...populatedPost,
        likesCount: likes.length,
        commentsCount: commentCount,
        isLikedByMe
      }
    });
  } catch (error) {
    console.error('Error editing post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to edit post'
    });
  }
};

// @desc    Get posts from followed users (latest first with pagination)
// @route   GET /api/posts/following
const getFollowingPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const followingIds = req.user.following || [];

    const totalPosts = await Post.countDocuments({
      author: { $in: followingIds }
    });

    const posts = await Post.find({
      author: { $in: followingIds }
    })
      .populate('author', 'name username avatar role bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const currentUserId = req.user._id.toString();

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likes = post.likes || [];
        const isLikedByMe = likes.some((id) => id.toString() === currentUserId);

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: commentCount,
          isLikedByMe
        };
      })
    );

    return res.status(200).json({
      success: true,
      totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page,
      posts: postsWithMeta
    });
  } catch (error) {
    console.error('Error in getFollowingPosts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch following posts'
    });
  }
};

// @desc    Get posts by hashtag (latest first with pagination)
// @route   GET /api/posts/tag/:tag
const getPostsByHashtag = async (req, res) => {
  try {
    const rawTag = req.params.tag ? req.params.tag.trim().toLowerCase() : '';
    if (!rawTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag parameter is required'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const escapedTag = rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagRegex = new RegExp(`#${escapedTag}(?![a-zA-Z0-9_])`, 'i');

    const totalPosts = await Post.countDocuments({ text: tagRegex });

    const posts = await Post.find({ text: tagRegex })
      .populate('author', 'name username avatar role bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const currentUserId = req.user ? req.user._id.toString() : null;

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likes = post.likes || [];
        const isLikedByMe = currentUserId
          ? likes.some((id) => id.toString() === currentUserId)
          : false;

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: commentCount,
          isLikedByMe
        };
      })
    );

    return res.status(200).json({
      success: true,
      tag: rawTag,
      totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page,
      posts: postsWithMeta
    });
  } catch (error) {
    console.error('Error in getPostsByHashtag:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch hashtag posts'
    });
  }
};

// @desc    Get civic complaints (posts mentioning @bmc or marked as complaint)
// @route   GET /api/posts/complaints
const getComplaints = async (req, res) => {
  try {
    const { status, location, page: pageQuery, limit: limitQuery } = req.query;
    const page = parseInt(pageQuery, 10) || 1;
    const limit = parseInt(limitQuery, 10) || 20;
    const skip = (page - 1) * limit;

    const baseFilter = {
      $or: [{ isComplaint: true }, { text: /@bmc\b/i }]
    };

    const filter = { ...baseFilter };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (location && location.trim()) {
      filter.location = new RegExp(location.trim(), 'i');
    }

    const totalComplaints = await Post.countDocuments(filter);

    // Status counts for top summary tabs
    const [openCount, inProgressCount, resolvedCount, rejectedCount, allCount] = await Promise.all([
      Post.countDocuments({ ...baseFilter, status: 'open' }),
      Post.countDocuments({ ...baseFilter, status: 'in_progress' }),
      Post.countDocuments({ ...baseFilter, status: 'resolved' }),
      Post.countDocuments({ ...baseFilter, status: 'rejected' }),
      Post.countDocuments(baseFilter)
    ]);

    const posts = await Post.find(filter)
      .populate('author', 'name username avatar role bio')
      .populate('statusUpdatedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const currentUserId = req.user ? req.user._id.toString() : null;

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likes = post.likes || [];
        const isLikedByMe = currentUserId
          ? likes.some((id) => id.toString() === currentUserId)
          : false;

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: commentCount,
          isLikedByMe
        };
      })
    );

    return res.status(200).json({
      success: true,
      stats: {
        all: allCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        rejected: rejectedCount
      },
      totalPosts: totalComplaints,
      totalPages: Math.ceil(totalComplaints / limit),
      currentPage: page,
      posts: postsWithMeta
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints'
    });
  }
};

// @desc    Update complaint status & official note (BMC / Admin only)
// @route   PATCH /api/posts/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, statusNote } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isBmc = req.user.username.toLowerCase() === 'bmc';
    const isAdmin = req.user.role === 'admin';

    if (!isBmc && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only BMC officials or administrators can update complaint status'
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be open, in_progress, resolved, or rejected'
      });
    }

    const previousStatus = post.status;
    post.status = status;
    if (statusNote !== undefined) {
      post.statusNote = statusNote.trim();
    }
    post.statusUpdatedAt = new Date();
    post.statusUpdatedBy = req.user._id;

    await post.save();

    // Create Notification for the citizen author
    if (post.author.toString() !== req.user._id.toString()) {
      const statusLabels = {
        open: 'OPEN',
        in_progress: 'IN PROGRESS',
        resolved: 'RESOLVED',
        rejected: 'REJECTED'
      };

      const noteText = post.statusNote ? ` - Note: "${post.statusNote}"` : '';
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'status_update',
        post: post._id,
        message: `@${req.user.username} updated your complaint status to: ${statusLabels[status]}${noteText}`,
        metadata: {
          previousStatus,
          newStatus: status,
          statusNote: post.statusNote
        }
      });
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name username avatar role bio')
      .populate('statusUpdatedBy', 'name username')
      .lean();

    const commentCount = await Comment.countDocuments({ post: post._id });
    const likes = post.likes || [];
    const currentUserId = req.user._id.toString();

    return res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      post: {
        ...populatedPost,
        likesCount: likes.length,
        commentsCount: commentCount,
        isLikedByMe: likes.some((id) => id.toString() === currentUserId)
      }
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status'
    });
  }
};

// @desc    Retry BMC integration for a complaint post
// @route   POST /api/posts/:id/retry-bmc
const retryBmcIntegration = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'official';
    if (!isAuthor && !isAdminOrStaff) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to retry integration for this post'
      });
    }

    if (!post.isComplaint) {
      return res.status(400).json({
        success: false,
        message: 'Post is not marked as a civic complaint'
      });
    }

    const updatedPost = await processPostIntegration(post._id);

    return res.status(200).json({
      success: true,
      message: 'BMC integration processed',
      integrationStatus: updatedPost?.integrationStatus,
      bmcComplaintId: updatedPost?.bmcComplaintId,
      bmcReplied: updatedPost?.bmcReplied,
      post: updatedPost
    });
  } catch (error) {
    console.error('Error retrying BMC integration:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry BMC integration'
    });
  }
};

// @desc    Handle resolution & status synchronization from BMC backend
// @route   POST /api/posts/bmc-resolve
const handleBmcResolutionSync = async (req, res) => {
  try {
    const { complaintId, externalReference, oldStatus, newStatus, eventKey, note } = req.body;

    if (!complaintId && !externalReference) {
      return res.status(400).json({
        success: false,
        message: 'complaintId or externalReference is required'
      });
    }

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'newStatus is required'
      });
    }

    const result = await syncResolutionFromBmc({
      complaintId,
      externalReference,
      oldStatus,
      newStatus,
      eventKey,
      note
    });

    if (result.notFound) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error handling BMC resolution sync:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync BMC resolution'
    });
  }
};

module.exports = {
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
};
