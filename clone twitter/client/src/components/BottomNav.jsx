import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';

export default function BottomNav() {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const loadUnread = async () => {
      try {
        const res = await notificationsAPI.getNotifications();
        if (res.data.success) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (e) {
        // quiet error
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 h-14 flex items-center justify-around pb-[env(safe-area-inset-bottom)] shadow-2xl"
      aria-label="Mobile Navigation"
    >
      {/* Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-full transition active:scale-95 ${
            isActive ? 'text-sky-400' : 'text-zinc-400 hover:text-white'
          }`
        }
        aria-label="Home"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Home</span>
      </NavLink>

      {/* Search */}
      <NavLink
        to="/search"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-full transition active:scale-95 ${
            isActive ? 'text-sky-400' : 'text-zinc-400 hover:text-white'
          }`
        }
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Search</span>
      </NavLink>

      {/* Notifications / Alerts */}
      <NavLink
        to="/notifications"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-full transition active:scale-95 relative ${
            isActive ? 'text-sky-400' : 'text-zinc-400 hover:text-white'
          }`
        }
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-sky-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-black" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Alerts</span>
      </NavLink>

      {/* Profile */}
      <NavLink
        to={isAuthenticated ? `/profile/${user?.username}` : '/login'}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-full transition active:scale-95 ${
            isActive ? 'text-sky-400' : 'text-zinc-400 hover:text-white'
          }`
        }
        aria-label="Profile"
      >
        {isAuthenticated && user?.avatar ? (
          <img
            src={user.avatar}
            alt={user?.name || 'Profile'}
            className="w-5 h-5 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <User className="w-5 h-5" />
        )}
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Profile</span>
      </NavLink>
    </nav>
  );
}
