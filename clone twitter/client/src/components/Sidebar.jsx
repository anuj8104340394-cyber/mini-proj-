import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  User,
  ShieldAlert,
  MapPin,
  LogOut,
  PenSquare,
  ShieldCheck,
  CheckCircle2,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

export default function Sidebar({ onOpenPostModal }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const navigate = useNavigate();

  return (
    <aside className="w-20 xl:w-64 flex flex-col justify-between h-screen sticky top-0 px-2 xl:px-4 py-4 border-r border-slate-800 bg-slate-950/80 backdrop-blur z-20">
      <div className="flex flex-col space-y-3">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center space-x-3 p-3 rounded-full hover:bg-slate-800/60 transition w-fit group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="hidden xl:inline text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            CivicX
          </span>
        </NavLink>

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center space-x-4 p-3 rounded-xl transition font-medium ${
                isActive
                  ? 'bg-slate-800/90 text-sky-400 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`
            }
          >
            <Home className="w-6 h-6 shrink-0" />
            <span className="hidden xl:inline text-base">Home Feed</span>
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to={`/profile/${user?.username}`}
              className={({ isActive }) =>
                `flex items-center space-x-4 p-3 rounded-xl transition font-medium ${
                  isActive
                    ? 'bg-slate-800/90 text-sky-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <User className="w-6 h-6 shrink-0" />
              <span className="hidden xl:inline text-base">My Profile</span>
            </NavLink>
          )}

          {user?.ward && (
            <div className="hidden xl:flex items-center space-x-3 px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>Assigned: {user.ward}</span>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="hidden xl:flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-950/30 rounded-lg border border-amber-800/40">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Authority Active</span>
            </div>
          )}

          {!isInstalled && (isInstallable || isIOS) && (
            <button
              onClick={installApp}
              className="flex items-center space-x-4 p-3 rounded-xl transition font-medium text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 w-full text-left"
              title="Install App"
            >
              <Download className="w-6 h-6 shrink-0" />
              <span className="hidden xl:inline text-base font-semibold">Install App</span>
            </button>
          )}
        </nav>

        {/* Post Button */}
        {isAuthenticated ? (
          <button
            onClick={onOpenPostModal}
            className="w-full mt-4 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition active:scale-95"
          >
            <PenSquare className="w-5 h-5 shrink-0" />
            <span className="hidden xl:inline">Report Complaint</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-4 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition"
          >
            <span className="hidden xl:inline">Log In to Post</span>
            <span className="xl:hidden">Login</span>
          </button>
        )}
      </div>

      {/* User Footer Card */}
      {isAuthenticated ? (
        <div className="border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 transition">
            <div
              className="flex items-center space-x-3 cursor-pointer overflow-hidden"
              onClick={() => navigate(`/profile/${user?.username}`)}
            >
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`
                }
                alt={user?.name}
                className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 shrink-0"
              />
              <div className="hidden xl:flex flex-col min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-semibold text-white truncate">
                    {user?.name}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                      ADMIN
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 truncate">
                  @{user?.username}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="hidden xl:flex text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800/60 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-800/80 pt-3 flex flex-col space-y-2">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 text-sm font-medium py-2 rounded-lg transition"
          >
            Sign Up
          </button>
        </div>
      )}
    </aside>
  );
}
