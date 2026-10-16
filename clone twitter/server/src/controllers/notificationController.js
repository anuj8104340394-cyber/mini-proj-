const Notification = require('../models/Notification');

// @desc    Get current user's notifications
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name username avatar role')
      .populate('post', 'text status location isComplaint')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all as read'
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
