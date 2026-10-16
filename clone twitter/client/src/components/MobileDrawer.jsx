import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, User, Bell, LogOut, LogIn, UserPlus, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

export default function MobileDrawer({ isOpen, onClose, unreadCount = 0 }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const navigate = useNavigate();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const handleNav = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-72 max-w-[80vw] h-full bg-zinc-950 border-r border-zinc-800 p-5 flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div>
          {/* Header Row: User Info & Close */}
          <div className="flex items-start justify-between mb-4">
            {isAuthenticated ? (
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`
                }
                alt={user?.name}
                className="w-12 h-12 rounded-full border border-zinc-800 object-cover bg-zinc-900"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400">
                <User className="w-6 h-6" />
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Details */}
          {isAuthenticated ? (
            <div className="mb-6">
              <h2 className="font-bold text-base text-white leading-tight">
                {user?.name}
              </h2>
              <p className="text-xs text-zinc-500">@{user?.username}</p>

              {user?.bio && (
                <p className="text-xs text-zinc-300 mt-2 line-clamp-2">
                  {user.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 mt-3 text-xs">
                <button
                  onClick={() => handleNav(`/profile/${user?.username}`)}
                  className="hover:underline flex items-center space-x-1"
                >
                  <span className="font-bold text-white">
                    {user?.followingCount || 0}
                  </span>
                  <span className="text-zinc-500">Following</span>
                </button>
                <button
                  onClick={() => handleNav(`/profile/${user?.username}`)}
                  className="hover:underline flex items-center space-x-1"
                >
                  <span className="font-bold text-white">
                    {user?.followersCount || 0}
                  </span>
                  <span className="text-zinc-500">Followers</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="font-bold text-base text-white">Welcome to Twitter</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Log in to follow accounts and join the conversation.
              </p>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1 border-t border-zinc-900 pt-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNav(`/profile/${user?.username}`)}
                  className="w-full flex items-center space-x-3.5 px-3 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900 transition font-medium text-sm min-h-[44px]"
                >
                  <User className="w-5 h-5 text-zinc-400" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => handleNav('/notifications')}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-zinc-200 hover:bg-zinc-900 transition font-medium text-sm min-h-[44px]"
                >
                  <div className="flex items-center space-x-3.5">
                    <Bell className="w-5 h-5 text-zinc-400" />
                    <span>Alerts & Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[11px] bg-sky-500 text-white font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNav('/login')}
                  className="w-full flex items-center space-x-3.5 px-3 py-3 rounded-xl text-sky-400 hover:bg-zinc-900 transition font-medium text-sm min-h-[44px]"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Log in</span>
                </button>
                <button
                  onClick={() => handleNav('/signup')}
                  className="w-full flex items-center space-x-3.5 px-3 py-3 rounded-xl text-white hover:bg-zinc-900 transition font-medium text-sm min-h-[44px]"
                >
                  <UserPlus className="w-5 h-5 text-zinc-400" />
                  <span>Sign up</span>
                </button>
              </>
            )}

            {!isInstalled && (isInstallable || isIOS) && (
              <button
                onClick={() => {
                  onClose();
                  installApp();
                }}
                className="w-full flex items-center space-x-3.5 px-3 py-3 rounded-xl text-sky-400 hover:bg-zinc-900 transition font-medium text-sm min-h-[44px]"
              >
                <Download className="w-5 h-5 text-sky-400" />
                <span>Install App</span>
              </button>
            )}
          </nav>
        </div>

        {/* Bottom Drawer Action (Logout) */}
        {isAuthenticated && (
          <div className="border-t border-zinc-900 pt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-rose-400 hover:bg-zinc-900/80 transition text-sm font-medium min-h-[44px]"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
