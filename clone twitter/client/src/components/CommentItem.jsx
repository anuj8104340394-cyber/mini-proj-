import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquareReply, Trash2, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { commentsAPI } from '../services/api';
import FormattedText from './FormattedText';

export default function CommentItem({ comment, postId, onReplyAdded, onCommentDeleted }) {
  const { user: currentUser } = useAuth();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const author = comment.author || {};
  const isAuthor = currentUser && (currentUser.id === author._id || currentUser.id === author.id);
  const isAdmin = currentUser && currentUser.role === 'admin';
  const canDelete = isAuthor || isAdmin;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setLoading(true);
    try {
      const res = await commentsAPI.createComment(postId, {
        text: replyText.trim(),
        parentComment: comment._id
      });

      if (res.data.success) {
        setReplyText('');
        setShowReplyBox(false);
        if (onReplyAdded) {
          onReplyAdded(res.data.comment, comment._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    setIsDeleting(true);
    try {
      const res = await commentsAPI.deleteComment(comment._id);
      if (res.data.success && onCommentDeleted) {
        onCommentDeleted(comment._id, comment.parentComment);
      }
    } catch (err) {
      alert('Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : '';

  return (
    <div className="flex flex-col space-y-2 py-3 border-b border-zinc-800/60">
      <div className="flex space-x-3">
        <img
          src={
            author.avatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${author.username}`
          }
          alt={author.name}
          className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 shrink-0 object-cover"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="font-semibold text-xs text-white">
                {author.name || 'User'}
              </span>
              <span className="text-xs text-zinc-500">@{author.username}</span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">{timeAgo}</span>
            </div>

            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-zinc-500 hover:text-rose-400 p-1 rounded transition"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-200 mt-1 whitespace-pre-line leading-relaxed break-words">
            <FormattedText text={comment.text} />
          </p>

          {/* Reply Toggle */}
          {currentUser && (
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 mt-1.5 flex items-center space-x-1 transition"
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              <span>{showReplyBox ? 'Cancel' : 'Reply'}</span>
            </button>
          )}

          {/* Reply Box Form */}
          {showReplyBox && (
            <form onSubmit={handleReplySubmit} className="mt-2 flex space-x-2">
              <input
                type="text"
                placeholder={`Replying to @${author.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={280}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={loading || !replyText.trim()}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 font-medium transition"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>Reply</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Direct Replies (One level of nesting) */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-zinc-800 space-y-2">
              {comment.replies.map((reply) => {
                const replyAuthor = reply.author || {};
                const replyIsAuthor =
                  currentUser &&
                  (currentUser.id === replyAuthor._id || currentUser.id === replyAuthor.id);
                const replyCanDelete = replyIsAuthor || isAdmin;
                const replyTimeAgo = reply.createdAt
                  ? formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })
                  : '';

                return (
                  <div key={reply._id} className="pt-2 first:pt-0">
                    <div className="flex space-x-2">
                      <img
                        src={
                          replyAuthor.avatar ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${replyAuthor.username}`
                        }
                        alt={replyAuthor.name}
                        className="w-6 h-6 rounded-full border border-zinc-800 bg-zinc-900 shrink-0 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-white">
                              {replyAuthor.name || 'User'}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              @{replyAuthor.username}
                            </span>
                            <span className="text-[11px] text-zinc-600">·</span>
                            <span className="text-[11px] text-zinc-500">
                              {replyTimeAgo}
                            </span>
                          </div>

                          {replyCanDelete && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Delete this reply?')) return;
                                try {
                                  await commentsAPI.deleteComment(reply._id);
                                  if (onCommentDeleted) {
                                    onCommentDeleted(reply._id, comment._id);
                                  }
                                } catch (e) {
                                  alert('Failed to delete reply');
                                }
                              }}
                              className="text-zinc-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-zinc-200 mt-0.5 break-words">
                          <FormattedText text={reply.text} />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
