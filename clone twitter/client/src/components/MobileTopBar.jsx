import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User } from 'lucide-react';
import TwitterIcon from './TwitterIcon';
import MobileDrawer from './MobileDrawer';
import { useAuth } from '../context/AuthContext';

export default function MobileTopBar({ unreadCount = 0 }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-zinc-800 px-3.5 h-14 flex items-center justify-between">
        {/* Left: Avatar triggers Drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-start focus:outline-none"
          aria-label="Open navigation menu"
        >
          {isAuthenticated ? (
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`
              }
              alt={user?.name || 'Profile'}
              className="w-8 h-8 rounded-full border border-zinc-800 object-cover bg-zinc-900 active:scale-95 transition"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400">
              <User className="w-4 h-4" />
            </div>
          )}
        </button>

        {/* Center: App Logo */}
        <Link
          to="/"
          className="flex items-center space-x-1.5 focus:outline-none active:scale-95 transition"
          aria-label="Home"
        >
          <TwitterIcon className="w-6 h-6 text-white" />
        </Link>

        {/* Right: Search button */}
        <button
          onClick={() => navigate('/search')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-end text-zinc-300 hover:text-white transition focus:outline-none active:scale-95"
          aria-label="Search"
        >
          <div className="p-2 rounded-full hover:bg-zinc-900 transition">
            <Search className="w-5 h-5 text-zinc-300" />
          </div>
        </button>
      </div>

      {/* Slide-in Mobile Drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        unreadCount={unreadCount}
      />
    </>
  );
}
