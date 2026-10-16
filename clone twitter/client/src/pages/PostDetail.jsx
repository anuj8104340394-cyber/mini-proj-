import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle,
  Send,
  MapPin,
  ShieldCheck,
  Heart,
  Share2,
  Trash2,
  Check,
  Pencil,
  X,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CommentItem from '../components/CommentItem';
import FormattedText from '../components/FormattedText';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Edit post state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [isRetryingBmc, setIsRetryingBmc] = useState(false);

  const handleRetryBmc = async () => {
    setIsRetryingBmc(true);
    try {
      const res = await postsAPI.retryBmcIntegration(id);
      if (res.data.success && res.data.post) {
        setPost(res.data.post);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retry BMC integration');
    } finally {
      setIsRetryingBmc(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [postRes, commentsRes] = await Promise.all([
        postsAPI.getPostById(id),
        commentsAPI.getComments(id)
      ]);

      if (postRes.data.success) {
        const p = postRes.data.post;
        setPost(p);
        setIsLiked(p.isLikedByMe || false);
        setLikesCount(p.likesCount || 0);
      }

      if (commentsRes.data.success) {
        setComments(commentsRes.data.comments || []);
      }
    } catch (err) {
      setError('Post not found or has been removed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await postsAPI.toggleLike(id);
      if (res.data.success) {
        setIsLiked(res.data.isLikedByMe);
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (nextLiked ? prev - 1 : prev + 1));
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await postsAPI.deletePost(id);
      navigate('/');
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  const handleOpenEdit = () => {
    if (!post) return;
    setEditText(post.text);
    setEditLocation(post.location || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) {
      setEditError('Post text cannot be empty');
      return;
    }
    if (editText.trim().length > 280) {
      setEditError('Post cannot exceed 280 characters');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await postsAPI.editPost(id, {
        text: editText.trim(),
        location: editLocation.trim()
      });

      if (res.data.success) {
        setPost(res.data.post);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };


  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await commentsAPI.createComment(id, {
        text: commentText.trim()
      });
      if (res.data.success) {
        setComments([...comments, res.data.comment]);
        setCommentText('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyAdded = (reply, parentId) => {
    setComments((prevComments) =>
      prevComments.map((c) => {
        if (c._id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), reply]
          };
        }
        return c;
      })
    );
  };

  const handleCommentDeleted = (commentId, parentId) => {
    if (parentId) {
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).filter((r) => r._id !== commentId)
            };
          }
          return c;
        })
      );
    } else {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    }
  };

  const author = post?.author || {};
  const isAuthor =
    currentUser && (currentUser.id === author._id || currentUser.id === author.id);
  const isAdmin = currentUser && currentUser.role === 'admin';
  const canDelete = isAuthor || isAdmin;

  const timeAgo = post?.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen p-12 flex justify-center items-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen p-8 text-center text-zinc-400">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-2">Post Not Found</h2>
        <p className="text-xs text-zinc-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-full"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen bg-black">
      {/* Top Header */}
      <div className="sticky top-14 z-20 bg-black/85 backdrop-blur-md px-3 py-2 border-b border-zinc-800 flex items-center space-x-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-white">Post</h2>
      </div>

      {/* Main Post Content */}
      <div className="p-4 border-b border-zinc-800">
        {/* Author Header */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate(`/profile/${author.username}`)}
          >
            <img
              src={
                author.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${author.username}`
              }
              alt={author.name}
              className="w-11 h-11 rounded-full border border-zinc-800 bg-zinc-900 object-cover"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white hover:underline">
                  {author.name}
                </span>
                {author.role === 'admin' && (
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 font-semibold px-1.5 py-0.2 rounded border border-sky-500/20 flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                    ADMIN
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500">@{author.username}</span>
            </div>
          </div>

          {post.location && (
            <div className="flex items-center space-x-1 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{post.location}</span>
            </div>
          )}
        </div>

        {/* Civic Complaint & BMC Integration Card */}
        {(post.isComplaint || post.bmcComplaintId) && (
          <div className="my-3 p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-semibold text-sky-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                BMC Civic Complaint
              </span>
              {post.bmcComplaintId && (
                <span className="font-mono bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded text-xs border border-sky-700/50">
                  Ref ID: #{post.bmcComplaintId}
                </span>
              )}
              {post.integrationStatus === 'registered' && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Registered with BMC
                </span>
              )}
              {(post.integrationStatus === 'pending' || post.integrationStatus === 'processing') && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Forwarding to BMC...
                </span>
              )}
              {post.integrationStatus === 'failed' && (
                <span className="inline-flex items-center gap-1 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Forwarding failed
                </span>
              )}
            </div>

            {post.integrationStatus === 'failed' && isAuthor && (
              <button
                onClick={handleRetryBmc}
                disabled={isRetryingBmc}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-rose-900/50 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 text-xs font-medium transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingBmc ? 'animate-spin' : ''}`} />
                <span>Retry BMC Registration</span>
              </button>
            )}
          </div>
        )}

        {/* Text */}
        <p className="text-base text-zinc-100 whitespace-pre-line leading-relaxed my-3 break-words">
          <FormattedText text={post.text} />
        </p>

        {/* Attached photo / video */}
        {post.image && (
          (post.mediaType === 'video' || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(post.image)) ? (
            <div className="my-3 rounded-2xl overflow-hidden border border-zinc-800 bg-black">
              <video
                src={post.image}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[500px] object-contain rounded-2xl bg-black"
              />
            </div>
          ) : (
            <div className="my-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <img
                src={post.image}
                alt="Post visual"
                className="w-full max-h-[480px] object-contain"
              />
            </div>
          )
        )}


        {/* Timestamp & edited label */}
        <div className="text-xs text-zinc-500 py-2.5 border-y border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Posted {timeAgo}</span>
            {post.isEdited && (
              <span
                className="text-[11px] text-zinc-400 italic bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800"
                title="This post has been edited"
              >
                edited
              </span>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-around py-2.5 border-b border-zinc-800 text-zinc-500 text-xs">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1.5 transition ${
              isLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{likesCount} Likes</span>
          </button>

          <div className="flex items-center space-x-1.5 text-zinc-500">
            <MessageCircle className="w-4 h-4" />
            <span>{comments.length} Comments</span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center space-x-1 hover:text-sky-400 transition"
            title="Copy post link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>

          {isAuthor && (
            <button
              onClick={handleOpenEdit}
              className="flex items-center space-x-1 text-zinc-500 hover:text-sky-400 transition"
              title="Edit post"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDeletePost}
              className="flex items-center space-x-1 text-zinc-500 hover:text-rose-500 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Reply Composer */}
      {currentUser ? (
        <form onSubmit={handleAddComment} className="p-3 border-b border-zinc-800 flex space-x-3 bg-zinc-950">
          <img
            src={
              currentUser.avatar ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.username}`
            }
            alt={currentUser.name}
            className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900 object-cover shrink-0"
          />
          <div className="flex-1 flex flex-col space-y-2">
            <textarea
              rows={2}
              placeholder="Post your reply"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={280}
              className="w-full bg-transparent border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-xs px-4 py-1.5 rounded-full transition flex items-center space-x-1"
              >
                {submittingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Reply</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 border-b border-zinc-800 text-center bg-zinc-950 text-xs text-zinc-400">
          <span>Log in to reply to this post. </span>
          <button
            onClick={() => navigate('/login')}
            className="text-sky-400 font-semibold hover:underline ml-1"
          >
            Log in
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Replies ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No replies yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postId={id}
                onReplyAdded={handleReplyAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Post Modal */}
      {isEditModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-sky-400" />
                <span>Edit Post</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <p className="text-xs text-rose-400 mb-3 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl">
                {editError}
              </p>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-zinc-400">
                    Content
                  </label>
                  <span
                    className={`text-[11px] ${
                      editText.length > 280 ? 'text-rose-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {editText.length}/280
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={280}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
                  placeholder="What's happening?"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Location (optional)
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-sky-400 absolute left-3" />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    maxLength={50}
                    placeholder="Add location/ward..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editText.trim() || editText.length > 280}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-xs px-5 py-1.5 rounded-full transition flex items-center space-x-1"
                >
                  {savingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mx-2" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
