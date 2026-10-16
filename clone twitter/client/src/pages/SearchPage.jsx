import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Loader2, Hash, UserPlus, Check } from 'lucide-react';
import { usersAPI, postsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import WhoToFollow from '../components/WhoToFollow';

const POPULAR_TAGS = ['mumbai', 'technology', 'webdev', 'coding', 'india', 'react'];

export default function SearchPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('people'); // 'people' | 'hashtags'
  const [userResults, setUserResults] = useState([]);
  const [tagResults, setTagResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      setTagResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const cleanQuery = query.trim().replace(/^[@#]/, '');
        // Search users
        const uRes = await usersAPI.search(cleanQuery);
        if (uRes.data.success) {
          setUserResults(uRes.data.users || []);
        }

        // If hashtags tab or query has #, try fetching tag posts
        try {
          const tRes = await postsAPI.getPostsByTag(cleanQuery, { limit: 10 });
          if (tRes.data.success) {
            setTagResults(tRes.data.posts || []);
          }
        } catch (e) {
          setTagResults([]);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

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
        setUserResults((prev) =>
          prev.map((u) =>
            u.username === targetUser.username
              ? { ...u, isFollowing: res.data.isFollowing }
              : u
          )
        );
      }
    } catch (err) {
      console.error('Follow error', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.username]: false }));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen bg-black border-x border-zinc-800 flex flex-col pb-20 md:pb-12">
      {/* Sticky Header with Search Input */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md px-3 py-2 border-b border-zinc-800 flex items-center space-x-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search @people or #hashtags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setUserResults([]);
                setTagResults([]);
              }}
              className="absolute right-3 text-zinc-400 hover:text-white p-1"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row (People vs Hashtags) when query exists */}
      {query.trim() && (
        <div className="flex border-b border-zinc-800 bg-black/80 backdrop-blur-xs sticky top-[57px] z-20">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 py-3 text-center text-xs font-bold transition relative ${
              activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>People ({userResults.length})</span>
            {activeTab === 'people' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-sky-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('hashtags')}
            className={`flex-1 py-3 text-center text-xs font-bold transition relative ${
              activeTab === 'hashtags' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>Hashtags ({tagResults.length})</span>
            {activeTab === 'hashtags' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* Main Search Content */}
      <div className="flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs">Searching Twitter...</span>
          </div>
        ) : query.trim() ? (
          /* Search Results */
          <div>
            {activeTab === 'people' ? (
              userResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No people found for "{query}"
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {userResults.map((u) => (
                    <div
                      key={u.id || u._id}
                      onClick={() => navigate(`/profile/${u.username}`)}
                      className="p-4 hover:bg-zinc-950/70 cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-3">
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                          }
                          alt={u.name}
                          className="w-11 h-11 rounded-full border border-zinc-800 object-cover bg-zinc-900 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-white truncate block hover:underline">
                            {u.name}
                          </span>
                          <span className="text-xs text-zinc-500 truncate block">
                            @{u.username}
                          </span>
                          {u.bio && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleFollow(e, u)}
                        disabled={actionLoading[u.username]}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-full transition shrink-0 min-h-[36px] ${
                          u.isFollowing
                            ? 'bg-black border border-zinc-700 text-white hover:text-rose-400 hover:border-rose-900'
                            : 'bg-white hover:bg-zinc-200 text-black'
                        }`}
                      >
                        {actionLoading[u.username] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-2" />
                        ) : u.isFollowing ? (
                          'Following'
                        ) : (
                          'Follow'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Hashtags Tab Results */
              tagResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No posts found for #{query.replace(/^#/, '')}
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  <div className="p-3 bg-zinc-950 text-xs text-zinc-400 flex items-center space-x-1.5">
                    <Hash className="w-4 h-4 text-sky-400" />
                    <span>Posts tagged with #{query.replace(/^#/, '')}</span>
                  </div>
                  {tagResults.map((post) => (
                    <div
                      key={post._id}
                      onClick={() => navigate(`/post/${post._id}`)}
                      className="p-4 hover:bg-zinc-950/60 transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-1">
                        <span className="font-bold text-zinc-200">
                          {post.author?.name}
                        </span>
                        <span>@{post.author?.username}</span>
                      </div>
                      <p className="text-sm text-zinc-200 line-clamp-2">
                        {post.text}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          /* Empty Search State: Bring Desktop Sidebar Content to Mobile! */
          <div className="p-4 space-y-6">
            {/* Trending Hashtags */}
            <div>
              <h2 className="text-base font-bold text-white mb-3 flex items-center space-x-1.5">
                <Hash className="w-4 h-4 text-sky-400" />
                <span>Trending for you</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => navigate(`/tag/${tag}`)}
                    className="p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 rounded-2xl text-left transition flex flex-col min-h-[56px]"
                  >
                    <span className="text-[11px] text-zinc-500">Trending in India</span>
                    <span className="text-sm font-bold text-sky-400">#{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Who To Follow Widget (mobile view) */}
            <WhoToFollow />
          </div>
        )}
      </div>
    </div>
  );
}
