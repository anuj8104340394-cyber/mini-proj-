const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// @desc    Get user profile and their posts
// @route   GET /api/users/:username
const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({
      username: username.toLowerCase().trim()
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const posts = await Post.find({ author: user._id })
      .populate('author', 'name username avatar role bio')
      .sort({ createdAt: -1 })
      .lean();

    const currentUserId = req.user ? req.user._id.toString() : null;

    let totalLikesReceived = 0;
    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({ post: post._id });
        const likes = post.likes || [];
        totalLikesReceived += likes.length;
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

    const followers = user.followers || [];
    const following = user.following || [];
    const isFollowing = currentUserId
      ? followers.some((id) => id.toString() === currentUserId)
      : false;
    const isSelf = currentUserId === user._id.toString();

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        createdAt: user.createdAt,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing,
        isSelf
      },
      stats: {
        totalPosts: posts.length,
        totalLikes: totalLikesReceived
      },
      posts: postsWithMeta
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

// @desc    Search users by username or name
// @route   GET /api/users/search
const searchUsers = async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';

    let users = [];
    if (!query) {
      // Return suggestions or popular accounts (BMC + top users)
      users = await User.find({})
        .select('name username avatar bio role followers')
        .limit(8)
        .lean();
    } else {
      const regex = new RegExp(query, 'i');
      users = await User.find({
        $or: [{ username: regex }, { name: regex }]
      })
        .select('name username avatar bio role followers')
        .limit(10)
        .lean();
    }

    const currentUserId = req.user ? req.user._id.toString() : null;

    const formattedUsers = users.map((u) => {
      const followers = u.followers || [];
      return {
        id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        role: u.role,
        followersCount: followers.length,
        isFollowing: currentUserId
          ? followers.some((id) => id.toString() === currentUserId)
          : false
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
};

// @desc    Get recommended users to follow
// @route   GET /api/users/suggestions
const getSuggestions = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const filter = currentUserId ? { _id: { $ne: currentUserId } } : {};

    const users = await User.find(filter)
      .select('name username avatar bio role followers')
      .limit(5)
      .lean();

    const currentUserIdStr = currentUserId ? currentUserId.toString() : null;

    const suggestions = users.map((u) => {
      const followers = u.followers || [];
      return {
        id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        role: u.role,
        followersCount: followers.length,
        isFollowing: currentUserIdStr
          ? followers.some((id) => id.toString() === currentUserIdStr)
          : false
      };
    });

    return res.status(200).json({
      success: true,
      users: suggestions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions'
    });
  }
};

// @desc    Follow or Unfollow a user
// @route   POST /api/users/:username/follow
const toggleFollow = async (req, res) => {
  try {
    const { username } = req.params;
    const targetUser = await User.findOne({
      username: username.toLowerCase().trim()
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const currentUserId = req.user._id;
    const targetUserId = targetUser._id;

    const isFollowing = targetUser.followers.some(
      (id) => id.toString() === currentUserId.toString()
    );

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: currentUserId }
      });
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUserId }
      });
    } else {
      // Follow
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUserId }
      });
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetUserId }
      });
    }

    const updatedTarget = await User.findById(targetUserId);

    return res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: updatedTarget.followers.length,
      message: isFollowing ? `Unfollowed @${username}` : `Following @${username}`
    });
  } catch (error) {
    console.error('Follow toggle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update follow status'
    });
  }
};

// @desc    Update user profile (Name, Bio, Avatar image)
// @route   PATCH /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      username,
      bio,
      avatar: avatarUrlInput,
      currentPassword,
      newPassword
    } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 1. Update Display Name
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // 2. Update Username (if provided and changed)
    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();

      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 30 characters'
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username can only contain letters, numbers, and underscores'
        });
      }

      const existingUser = await User.findOne({
        username: cleanUsername,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `@${cleanUsername} is already taken by another user`
        });
      }

      user.username = cleanUsername;
    }

    // 3. Update Password (Strict validation)
    const hasPasswordInput = Boolean(
      (currentPassword && currentPassword.trim()) ||
      (newPassword && newPassword.trim())
    );

    if (hasPasswordInput) {
      if (!currentPassword || !currentPassword.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your current password to verify your identity'
        });
      }

      if (!newPassword || !newPassword.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a new password'
        });
      }

      // Check current password with database hash
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect! Password was not changed.'
        });
      }

      if (newPassword.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Disallow re-using the exact same password
      const isSamePassword = await bcrypt.compare(newPassword.trim(), user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as your current password'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword.trim(), salt);
    }

    // 4. Update Bio
    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    // Avatar upload (Cloudinary or local)
    if (req.file) {
      if (
        req.file.path &&
        (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))
      ) {
        user.avatar = req.file.path; // Cloudinary secure URL
      } else {
        user.avatar = `/uploads/${req.file.filename}`;
      }
    } else if (avatarUrlInput && avatarUrlInput.trim()) {
      user.avatar = avatarUrlInput.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        createdAt: user.createdAt,
        followersCount: (user.followers || []).length,
        followingCount: (user.following || []).length
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Get followers list for a user
// @route   GET /api/users/:username/followers
const getFollowers = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase().trim() })
      .populate('followers', 'name username avatar bio role followers')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUserIdStr = req.user ? req.user._id.toString() : null;

    const formattedList = (user.followers || []).map((u) => {
      const followers = u.followers || [];
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        role: u.role,
        followersCount: followers.length,
        isFollowing: currentUserIdStr
          ? followers.some((id) => id.toString() === currentUserIdStr)
          : false,
        isSelf: currentUserIdStr === u._id.toString()
      };
    });

    return res.status(200).json({
      success: true,
      user: {
        name: user.name,
        username: user.username
      },
      count: formattedList.length,
      users: formattedList
    });
  } catch (error) {
    console.error('Error in getFollowers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch followers'
    });
  }
};

// @desc    Get following list for a user
// @route   GET /api/users/:username/following
const getFollowing = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase().trim() })
      .populate('following', 'name username avatar bio role followers')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUserIdStr = req.user ? req.user._id.toString() : null;

    const formattedList = (user.following || []).map((u) => {
      const followers = u.followers || [];
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        role: u.role,
        followersCount: followers.length,
        isFollowing: currentUserIdStr
          ? followers.some((id) => id.toString() === currentUserIdStr)
          : false,
        isSelf: currentUserIdStr === u._id.toString()
      };
    });

    return res.status(200).json({
      success: true,
      user: {
        name: user.name,
        username: user.username
      },
      count: formattedList.length,
      users: formattedList
    });
  } catch (error) {
    console.error('Error in getFollowing:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch following'
    });
  }
};

module.exports = {
  getUserByUsername,
  searchUsers,
  getSuggestions,
  toggleFollow,
  updateProfile,
  getFollowers,
  getFollowing
};
