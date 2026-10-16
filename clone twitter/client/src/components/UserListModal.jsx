import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Users } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UserListModal({
  isOpen,
  onClose,
  initialTab = 'followers',
  username,
  onFollowCountChange
}) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const fetchUsers = async (tab) => {
    if (!username) return;
    setLoading(true);
    setError('');
    try {
      const res =
        tab === 'followers'
          ? await usersAPI.getFollowers(username)
          : await usersAPI.getFollowing(username);

      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && username) {
      fetchUsers(activeTab);
    }
  }, [isOpen, activeTab, username]);

  if (!isOpen) return null;

  const handleToggleFollow = async (targetUser) => {
    if (!currentUser) {
      onClose();
      navigate('/login');
      return;
    }

    setTogglingId(targetUser.id || targetUser._id);
    try {
      const res = await usersAPI.toggleFollow(targetUser.username);
      if (res.data.success) {
        const nextFollowingState = res.data.isFollowing;
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.username === targetUser.username
              ? {
                  ...u,
                  isFollowing: nextFollowingState,
                  followersCount: res.data.followersCount
                }
              : u
          )
        );

        if (onFollowCountChange) {
          onFollowCountChange(targetUser.username, nextFollowingState);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update follow status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUserClick = (targetUsername) => {
    onClose();
    navigate(`/profile/${targetUsername}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              @{username}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers: Followers vs Following */}
        <div className="flex border-b border-zinc-800 bg-black">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-center text-xs font-bold transition relative ${
              activeTab === 'followers'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Followers
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center text-xs font-bold transition relative ${
              activeTab === 'following'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Following
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>

        {/* User list body */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs">Loading {activeTab}...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-rose-400 px-4">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs px-4">
              {activeTab === 'followers'
                ? `@${username} doesn't have any followers yet.`
                : `@${username} is not following anyone yet.`}
            </div>
          ) : (
            users.map((u) => {
              const isCurrentMe = currentUser && (currentUser.username === u.username || currentUser.id === u._id);
              const isBusy = togglingId === (u.id || u._id);

              return (
                <div
                  key={u._id || u.id}
                  className="p-3.5 flex items-center justify-between hover:bg-zinc-900/50 transition cursor-pointer"
                  onClick={() => handleUserClick(u.username)}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                      }
                      alt={u.name}
                      className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-sm text-white truncate hover:underline">
                          {u.name}
                        </span>
                        {u.role === 'admin' && (
                          <span className="text-[9px] bg-sky-500/10 text-sky-400 font-semibold px-1 rounded border border-sky-500/20">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                      {u.bio && (
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5 max-w-xs">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Follow / Unfollow button */}
                  {!isCurrentMe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFollow(u);
                      }}
                      disabled={isBusy}
                      className={`shrink-0 font-semibold text-xs px-4 py-1.5 rounded-full transition ml-2 ${
                        u.isFollowing
                          ? 'bg-black hover:bg-rose-950/30 text-white hover:text-rose-400 border border-zinc-700 hover:border-rose-900'
                          : 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mx-1" />
                      ) : u.isFollowing ? (
                        'Following'
                      ) : (
                        'Follow'
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
