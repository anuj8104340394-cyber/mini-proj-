import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  AtSign,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import WhoToFollow from '../components/WhoToFollow';

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsAPI.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationsAPI.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }

    if (notification.post) {
      const postId = notification.post._id || notification.post;
      navigate(`/post/${postId}`);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 flex justify-center">
      {/* Center Main Column */}
      <div className="flex-1 max-w-2xl border-x border-zinc-800 min-h-screen bg-black">
        {/* Sticky Header */}
        <div className="sticky top-14 z-30 bg-black/85 backdrop-blur-md px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <h1 className="text-base font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-sky-500 text-white font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 p-1 rounded transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            <button
              onClick={fetchNotifications}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* List of Notifications */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs">Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3 px-6">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
              <Bell className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-white">No notifications yet</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              When someone tags you in a post, replies to your comments, or interacts with you, you will see alerts here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {notifications.map((item) => {
              const sender = item.sender || {};
              const isStatusUpdate = item.type === 'status_update';
              const isReply = item.type === 'reply';
              const timeAgo = item.createdAt
                ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                : '';

              return (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 flex space-x-3.5 hover:bg-zinc-950/60 transition cursor-pointer ${
                    !item.isRead ? 'bg-sky-950/15 border-l-2 border-l-sky-500' : ''
                  }`}
                >
                  {/* Type Icon */}
                  <div className="shrink-0 pt-0.5">
                    {isReply ? (
                      <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                    ) : item.type === 'like' ? (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full">
                        <Heart className="w-5 h-5 fill-rose-500" />
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                        <AtSign className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <img
                        src={
                          sender.avatar ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${sender.username}`
                        }
                        alt={sender.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-bold text-xs text-white">
                        {sender.name || `@${sender.username}`}
                      </span>
                      <span className="text-[11px] text-zinc-500">· {timeAgo}</span>

                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 ml-auto" />
                      )}
                    </div>

                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                      {item.message}
                    </p>

                    {item.post && (
                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1 italic">
                        "{item.post.text || 'View attached complaint'}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 pl-6 sticky top-14 h-fit">
        <WhoToFollow />
      </div>
    </div>
  );
}
