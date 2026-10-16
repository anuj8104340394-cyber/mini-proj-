import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, User, LogOut, LogIn, UserPlus, Search, X, Loader2, Bell } from 'lucide-react';
import TwitterIcon from './TwitterIcon';
import MobileTopBar from './MobileTopBar';
import { useAuth } from '../context/AuthContext';
import { usersAPI, notificationsAPI } from '../services/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchContainerRef = useRef(null);

  // Load unread notifications count if authenticated
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
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await usersAPI.search(searchQuery.trim());
        if (res.data.success) {
          setSearchResults(res.data.users || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectUser = (username) => {
    setShowDropdown(false);
    setSearchQuery('');
    navigate(`/profile/${username}`);
  };

  return (
    <>
      {/* 1. Mobile Top Bar (screen width below 768px / md) */}
      <MobileTopBar unreadCount={unreadCount} />

      {/* 2. Desktop Navigation Bar (md and up - completely preserves desktop layout) */}
      <header className="hidden md:block sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand / Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 text-sky-400 hover:text-sky-300 transition shrink-0"
          >
            <TwitterIcon className="w-6 h-6 text-white" />
            <span className="font-bold text-lg text-white tracking-tight">
              Twitter
            </span>
          </Link>

          {/* Global Search Users Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-sm">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search @username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-8 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 flex items-center justify-center space-x-2 text-zinc-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Searching users...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    No users found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-900">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u.username)}
                        className="p-3 hover:bg-zinc-900/70 cursor-pointer flex items-center space-x-3 transition"
                      >
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                          }
                          alt={u.name}
                          className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900 shrink-0 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs text-white truncate block">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate block">
                            @{u.username}
                          </span>
                          {u.bio && (
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Items */}
          <nav className="flex items-center space-x-2 shrink-0">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  isActive
                    ? 'bg-zinc-800 text-sky-400 font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>

            {isAuthenticated ? (
              <>
                {/* Notifications / Alerts */}
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition relative ${
                      isActive
                        ? 'bg-zinc-800 text-sky-400 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`
                  }
                >
                  <div className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-sky-400 rounded-full" />
                    )}
                  </div>
                  <span>Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-sky-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to={`/profile/${user?.username}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      isActive
                        ? 'bg-zinc-800 text-sky-400 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`
                  }
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </NavLink>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      isActive
                        ? 'bg-zinc-800 text-sky-400 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`
                  }
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </NavLink>

                <NavLink
                  to="/signup"
                  className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm px-4 py-1.5 rounded-full transition shadow-sm flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
