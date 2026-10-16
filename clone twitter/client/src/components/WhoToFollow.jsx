import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function WhoToFollow() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchSuggestions = async () => {
    try {
      const res = await usersAPI.getSuggestions();
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load suggestions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleToggleFollow = async (e, targetUser) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setActionLoading((prev) => ({ ...prev, [targetUser.username]: true }));
    try {
      const res = await usersAPI.toggleFollow(targetUser.username);
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.username === targetUser.username
              ? { ...u, isFollowing: res.data.isFollowing }
              : u
          )
        );
      }
    } catch (err) {
      console.error('Follow toggle error', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.username]: false }));
    }
  };

  if (loading || users.length === 0) return null;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 my-4">
      <h3 className="font-bold text-sm text-white mb-3">Who to follow</h3>
      <div className="divide-y divide-zinc-900">
        {users.slice(0, 4).map((u) => (
          <div
            key={u.id}
            onClick={() => navigate(`/profile/${u.username}`)}
            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              <img
                src={
                  u.avatar ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                }
                alt={u.name}
                className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-xs text-white truncate block group-hover:underline">
                  {u.name}
                </span>
                <span className="text-[11px] text-zinc-500 truncate block">
                  @{u.username}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => handleToggleFollow(e, u)}
              disabled={actionLoading[u.username]}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition shrink-0 ${
                u.isFollowing
                  ? 'bg-black hover:bg-rose-950/40 text-white hover:text-rose-400 border border-zinc-700'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              {actionLoading[u.username] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mx-1" />
              ) : u.isFollowing ? (
                'Following'
              ) : (
                'Follow'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
