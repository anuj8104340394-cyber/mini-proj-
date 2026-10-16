const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required']
    },
    text: {
      type: String,
      required: [true, 'Comment text cannot be empty'],
      trim: true,
      maxlength: [280, 'Comment text cannot exceed 280 characters']
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Comment', commentSchema);
