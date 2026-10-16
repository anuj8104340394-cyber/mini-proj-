const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get comments for a post (with one level of nested replies)
// @route   GET /api/posts/:id/comments
const getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;

    const allComments = await Comment.find({ post: postId })
      .populate('author', 'name username avatar role')
      .sort({ createdAt: 1 })
      .lean();

    const topLevelComments = [];
    const replyMap = new Map();

    allComments.forEach((comment) => {
      if (comment.parentComment) {
        const parentId = comment.parentComment.toString();
        if (!replyMap.has(parentId)) {
          replyMap.set(parentId, []);
        }
        replyMap.get(parentId).push(comment);
      } else {
        topLevelComments.push({
          ...comment,
          replies: []
        });
      }
    });

    topLevelComments.forEach((comment) => {
      const parentId = comment._id.toString();
      if (replyMap.has(parentId)) {
        comment.replies = replyMap.get(parentId);
      }
    });

    return res.status(200).json({
      success: true,
      count: allComments.length,
      comments: topLevelComments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
};

// @desc    Add comment or reply
// @route   POST /api/posts/:id/comments
const createComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { text, parentComment } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    if (text.trim().length > 280) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 280 characters'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    let validParent = null;
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (parent) {
        // Enforce 1 level of nesting: if replying to a reply, attach to its root parent
        validParent = parent.parentComment ? parent.parentComment : parent._id;
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      text: text.trim(),
      parentComment: validParent
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name username avatar role')
      .lean();

    // Notify post author if someone else replies/comments
    if (post.author.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'reply',
          post: post._id,
          message: `@${req.user.username} replied to your post: "${text.trim().slice(0, 80)}..."`
        });
      } catch (notifyErr) {
        console.warn('Failed to send comment notification:', notifyErr.message);
      }
    }

    // Notify all mentioned users in comment (Instagram style tag notification)
    const rawCommentMentions = text.trim().match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedCommentUsernames = [
      ...new Set(rawCommentMentions.map((m) => m.slice(1).toLowerCase()))
    ];

    if (mentionedCommentUsernames.length > 0) {
      try {
        const taggedUsers = await User.find({
          username: { $in: mentionedCommentUsernames },
          _id: { $nin: [req.user._id, post.author] }
        });

        for (const taggedUser of taggedUsers) {
          await Notification.create({
            recipient: taggedUser._id,
            sender: req.user._id,
            type: 'mention',
            post: post._id,
            message: `@${req.user.username} mentioned you in a comment: "${text.trim().slice(0, 80)}..."`
          });
        }
      } catch (notifyErr) {
        console.warn('Failed to send comment mention notification:', notifyErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: validParent ? 'Reply added' : 'Comment added',
      comment: {
        ...populatedComment,
        replies: []
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// @desc    Delete comment (own comment or admin)
// @route   DELETE /api/comments/:id
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment'
      });
    }

    // Delete comment and its direct replies
    await Comment.deleteMany({
      $or: [{ _id: req.params.id }, { parentComment: req.params.id }]
    });

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
};

module.exports = {
  getComments,
  createComment,
  deleteComment
};
