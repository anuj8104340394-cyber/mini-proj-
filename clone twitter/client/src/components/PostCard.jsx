import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  MapPin,
  ShieldCheck,
  Check,
  Pencil,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import FormattedText from './FormattedText';

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [currentPost, setCurrentPost] = useState(post);
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit post state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editLocation, setEditLocation] = useState(post.location || '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Image full preview modal
  const [showFullImage, setShowFullImage] = useState(false);
  const [isRetryingBmc, setIsRetryingBmc] = useState(false);

  const handleRetryBmc = async (e) => {
    e.stopPropagation();
    setIsRetryingBmc(true);
    try {
      const res = await postsAPI.retryBmcIntegration(currentPost._id);
      if (res.data.success && res.data.post) {
        setCurrentPost(res.data.post);
        if (onUpdate) onUpdate(res.data.post);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retry BMC integration');
    } finally {
      setIsRetryingBmc(false);
    }
  };

  useEffect(() => {
    setCurrentPost(post);
    setIsLiked(post.isLikedByMe || false);
    setLikesCount(post.likesCount || 0);
    setEditText(post.text);
    setEditLocation(post.location || '');
  }, [post]);

  const author = currentPost.author || {};
  const isAuthor = currentUser && (currentUser.id === author._id || currentUser.id === author.id);
  const isAdmin = currentUser && currentUser.role === 'admin';
  const canDelete = isAuthor || isAdmin;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await postsAPI.toggleLike(currentPost._id);
      if (res.data.success) {
        setIsLiked(res.data.isLikedByMe);
        setLikesCount(res.data.likesCount);
      }
    } catch (err) {
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (nextLiked ? prev - 1 : prev + 1));
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      const res = await postsAPI.deletePost(currentPost._id);
      if (res.data.success && onDelete) {
        onDelete(currentPost._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${currentPost._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEdit = (e) => {
    e.stopPropagation();
    setEditText(currentPost.text);
    setEditLocation(currentPost.location || '');
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
      const res = await postsAPI.editPost(currentPost._id, {
        text: editText.trim(),
        location: editLocation.trim()
      });

      if (res.data.success) {
        setCurrentPost(res.data.post);
        setIsEditModalOpen(false);
        if (onUpdate) {
          onUpdate(res.data.post);
        }
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };

  const timeAgo = currentPost.createdAt
    ? formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true })
    : '';

  const isVideo =
    currentPost.mediaType === 'video' ||
    (currentPost.image && /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(currentPost.image));

  return (
    <>
      <article
        onClick={() => navigate(`/post/${currentPost._id}`)}
        className="px-4 py-3 sm:p-4 border-b border-zinc-800 hover:bg-zinc-950/60 transition cursor-pointer flex space-x-3 group"
      >
        {/* Author Avatar (40px) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${author.username}`);
          }}
          className="shrink-0"
        >
          <img
            src={
              author.avatar ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${author.username}`
            }
            alt={author.name}
            className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover hover:opacity-90 transition"
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Header row: Name, Badge, Handle, Time */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
            <div className="flex items-center space-x-1.5 flex-wrap min-w-0">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${author.username}`);
                }}
                className="font-bold text-sm text-white hover:underline cursor-pointer truncate max-w-[160px] sm:max-w-xs"
              >
                {author.name || 'User'}
              </span>

              {author.role === 'admin' && (
                <span
                  title="Admin Role"
                  className="inline-flex items-center text-[10px] bg-sky-500/10 text-sky-400 font-semibold px-1.5 py-0.2 rounded border border-sky-500/20 shrink-0"
                >
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  ADMIN
                </span>
              )}

              <span className="text-xs text-zinc-500 truncate">@{author.username}</span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-500 shrink-0">{timeAgo}</span>

              {currentPost.isEdited && (
                <span
                  className="text-[10px] text-zinc-400 italic bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800 shrink-0"
                  title="This post has been edited"
                >
                  edited
                </span>
              )}
            </div>

            {/* Location pill under header */}
            {currentPost.location && (
              <div className="flex items-center space-x-1 text-[11px] text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full w-fit mt-0.5 sm:mt-0 max-w-[180px] truncate">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{currentPost.location}</span>
              </div>
            )}
          </div>

          {/* Civic Complaint & BMC Integration Badge */}
          {(currentPost.isComplaint || currentPost.bmcComplaintId) && (
            <div className="my-2 p-2 rounded-xl bg-sky-950/40 border border-sky-800/40 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-semibold text-sky-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  BMC Complaint
                </span>
                {currentPost.bmcComplaintId && (
                  <span className="font-mono bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded text-[11px] border border-sky-700/50" title={currentPost.bmcComplaintId}>
                    ID: #{currentPost.bmcComplaintId.slice(0, 8)}...
                  </span>
                )}
                {currentPost.status === 'resolved' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolved
                  </span>
                )}
                {currentPost.integrationStatus === 'registered' && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Registered
                  </span>
                )}
                {(currentPost.integrationStatus === 'pending' || currentPost.integrationStatus === 'processing') && (
                  <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Forwarding...
                  </span>
                )}
                {currentPost.integrationStatus === 'failed' && (
                  <span className="inline-flex items-center gap-1 text-rose-400 text-[11px]">
                    <AlertCircle className="w-3 h-3" /> Sync failed
                  </span>
                )}
              </div>

              {currentPost.integrationStatus === 'failed' && isAuthor && (
                <button
                  onClick={handleRetryBmc}
                  disabled={isRetryingBmc}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 text-[11px] font-medium transition disabled:opacity-50"
                  title="Retry forwarding to BMC"
                >
                  <RefreshCw className={`w-3 h-3 ${isRetryingBmc ? 'animate-spin' : ''}`} />
                  <span>Retry BMC</span>
                </button>
              )}
            </div>
          )}

          {/* Post Text */}
          <p className="text-[15px] text-zinc-100 whitespace-pre-line leading-relaxed my-2 break-words">
            <FormattedText text={currentPost.text} />
          </p>

          {/* Attached Media (Photo or Video) */}
          {currentPost.image && (
            isVideo ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-2.5 mb-2 rounded-2xl overflow-hidden border border-zinc-800 bg-black max-h-96 flex items-center justify-center"
              >
                <video
                  src={currentPost.image}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-96 object-contain rounded-2xl bg-black"
                />
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullImage(true);
                }}
                className="mt-2.5 mb-2 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-80 flex items-center justify-center cursor-pointer group/img"
              >
                <img
                  src={currentPost.image}
                  alt="Post visual"
                  className="w-full h-auto max-h-80 object-cover group-hover/img:scale-[1.01] transition-transform duration-200"
                  loading="lazy"
                />
              </div>
            )
          )}

          {/* Action Row (min 44x44px tap targets, spaced evenly) */}
          <div className="flex items-center justify-between text-zinc-500 text-xs mt-2 pt-1 border-t border-zinc-900/80 max-w-md -ml-2">
            {/* Comment */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/post/${currentPost._id}`);
              }}
              className="flex items-center space-x-1.5 hover:text-sky-400 transition min-w-[44px] min-h-[44px] px-2 rounded-full"
              aria-label="Comment"
            >
              <div className="p-1.5 rounded-full hover:bg-sky-500/10 transition">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{currentPost.commentsCount || 0}</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1.5 transition min-w-[44px] min-h-[44px] px-2 rounded-full ${
                isLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-500'
              }`}
              aria-label="Like"
            >
              <div className="p-1.5 rounded-full hover:bg-rose-500/10 transition">
                <Heart
                  className={`w-4 h-4 transition ${
                    isLiked ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
              </div>
              <span className="text-xs">{likesCount}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 hover:text-sky-400 transition min-w-[44px] min-h-[44px] px-2 rounded-full"
              title="Copy link"
              aria-label="Share"
            >
              <div className="p-1.5 rounded-full hover:bg-sky-500/10 transition">
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </div>
              <span className="hidden sm:inline text-xs">
                {copied ? 'Copied' : 'Share'}
              </span>
            </button>

            {/* Author actions: Edit & Delete */}
            <div className="flex items-center">
              {isAuthor && (
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center justify-center text-zinc-500 hover:text-sky-400 transition min-w-[44px] min-h-[44px] rounded-full"
                  title="Edit post"
                  aria-label="Edit post"
                >
                  <div className="p-1.5 rounded-full hover:bg-sky-500/10 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center text-zinc-500 hover:text-rose-500 transition min-w-[44px] min-h-[44px] rounded-full"
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <div className="p-1.5 rounded-full hover:bg-rose-500/10 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Fullscreen Image Preview Modal */}
      {showFullImage && currentPost.image && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowFullImage(false);
          }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
            aria-label="Close image"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={currentPost.image}
            alt="Fullscreen post visual"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Edit Post Modal (Responsive on mobile) */}
      {isEditModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Edit Post</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <textarea
                rows={4}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                maxLength={280}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />

              <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="bg-transparent focus:outline-none text-xs w-full text-zinc-200"
                />
              </div>

              {editError && <p className="text-xs text-rose-400">{editError}</p>}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-full min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-full disabled:opacity-50 min-h-[40px]"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
