const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required']
    },
    text: {
      type: String,
      required: [true, 'Post text cannot be empty'],
      trim: true,
      maxlength: [280, 'Post text cannot exceed 280 characters']
    },
    image: {
      type: String,
      default: ''
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'rejected'],
      default: 'open'
    },
    statusNote: {
      type: String,
      trim: true,
      default: ''
    },
    statusUpdatedAt: {
      type: Date
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isComplaint: {
      type: Boolean,
      default: false
    },
    complaintDepartment: {
      type: String,
      trim: true,
      default: ''
    },
    bmcComplaintId: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    integrationStatus: {
      type: String,
      enum: ['none', 'pending', 'processing', 'registered', 'failed'],
      default: 'none',
      index: true
    },
    integrationError: {
      type: String,
      trim: true,
      default: null
    },
    bmcReplied: {
      type: Boolean,
      default: false
    },
    bmcReplyCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    lastResolvedEventKey: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    resolutionCount: {
      type: Number,
      default: 0
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Post', postSchema);
