import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Building2, MessageCircle, AtSign, ArrowRight, Heart } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationToast() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeToast, setActiveToast] = useState(null);
  const lastNotifIdRef = useRef(null);
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveToast(null);
      lastNotifIdRef.current = null;
      initialFetchDoneRef.current = false;
      return;
    }

    const checkNewNotifications = async () => {
      try {
        const res = await notificationsAPI.getNotifications();
        if (res.data.success) {
          const list = res.data.notifications || [];
          if (list.length > 0) {
            const latest = list[0];

            // If first time loading
            if (!initialFetchDoneRef.current) {
              lastNotifIdRef.current = latest._id;
              initialFetchDoneRef.current = true;
              // If user has an unread notification on load, show it
              if (!latest.isRead) {
                setActiveToast(latest);
                setTimeout(() => {
                  setActiveToast((prev) => (prev?._id === latest._id ? null : prev));
                }, 7000);
              }
              return;
            }

            // If a brand new notification arrived and is unread
            if (latest._id !== lastNotifIdRef.current && !latest.isRead) {
              lastNotifIdRef.current = latest._id;
              setActiveToast(latest);

              // Auto dismiss after 7 seconds
              setTimeout(() => {
                setActiveToast((prev) => (prev?._id === latest._id ? null : prev));
              }, 7000);
            }
          }
        }
      } catch (err) {
        // quiet error
      }
    };

    checkNewNotifications();
    const interval = setInterval(checkNewNotifications, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  if (!activeToast) return null;

  const sender = activeToast.sender || {};
  const isStatusUpdate = activeToast.type === 'status_update';
  const isReply = activeToast.type === 'reply';
  const isLike = activeToast.type === 'like';
  const isMention = activeToast.type === 'mention';

  const handleClickToast = async () => {
    try {
      await notificationsAPI.markAsRead(activeToast._id);
    } catch (e) {}

    const toastCopy = activeToast;
    setActiveToast(null);

    if (toastCopy.post) {
      const postId = toastCopy.post._id || toastCopy.post;
      navigate(`/post/${postId}`);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 max-w-sm w-[92vw] sm:w-96 animate-in slide-in-from-top-6 fade-in duration-300">
      <div
        onClick={handleClickToast}
        className="bg-zinc-950/95 border border-zinc-700/80 hover:border-sky-400/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl cursor-pointer transition-all duration-200 flex items-start space-x-3 text-zinc-100 group shadow-sky-500/10 ring-1 ring-white/10 hover:scale-[1.02]"
      >
        {/* Avatar with Instagram-style gradient border ring */}
        <div className="relative shrink-0">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
            <img
              src={
                sender.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${sender.username}`
              }
              alt={sender.name}
              className="w-10 h-10 rounded-full border-2 border-black object-cover bg-zinc-900"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-black border border-zinc-700 shadow-sm">
            {isStatusUpdate ? (
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isReply ? (
              <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
            ) : isLike ? (
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            ) : (
              <AtSign className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wide flex items-center space-x-1">
              <span>
                {isReply
                  ? '💬 New Reply'
                  : isLike
                  ? '❤️ New Like'
                  : '🏷️ You were tagged!'}
              </span>
            </span>
            <span className="text-[10px] text-zinc-500">Just now</span>
          </div>

          <p className="text-xs text-zinc-200 font-medium leading-snug mt-0.5 line-clamp-2">
            {activeToast.message}
          </p>

          <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-sky-400 font-semibold group-hover:underline">
            <span>Tap to view in app</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast(null);
          }}
          className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
