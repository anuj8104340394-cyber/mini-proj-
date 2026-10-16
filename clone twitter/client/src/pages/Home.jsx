import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, AlertCircle, Feather, Plus, UserCheck } from 'lucide-react';
import CreatePostBox from '../components/CreatePostBox';
import ComposerModal from '../components/ComposerModal';
import PostCard from '../components/PostCard';
import WhoToFollow from '../components/WhoToFollow';
import { postsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function PostSkeleton() {
  return (
    <div className="p-4 border-b border-zinc-800 animate-pulse flex space-x-3">
      <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="flex items-center space-x-2">
          <div className="h-3.5 bg-zinc-800 rounded w-28" />
          <div className="h-3 bg-zinc-900 rounded w-20" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-zinc-800/80 rounded w-full" />
          <div className="h-3 bg-zinc-800/80 rounded w-4/5" />
        </div>
        <div className="h-8 bg-zinc-900/60 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

export default function Home() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [feedTab, setFeedTab] = useState('forYou'); // 'forYou' | 'following'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const fetchPosts = async (pageNum = 1, append = false, tab = feedTab) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const res =
        tab === 'following'
          ? await postsAPI.getFollowingPosts({ page: pageNum, limit: 10 })
          : await postsAPI.getPosts({ page: pageNum, limit: 10 });

      if (res.data.success) {
        const fetched = res.data.posts || [];
        if (append) {
          setPosts((prev) => [...prev, ...fetched]);
        } else {
          setPosts(fetched);
        }
        setHasMore(pageNum < res.data.totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      if (tab === 'following' && err.response?.status === 401) {
        setError('Please log in to view posts from people you follow.');
      } else {
        setError('Could not load posts. Please verify server connection.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, false, feedTab);
  }, [feedTab]);

  const handleTabChange = (newTab) => {
    if (newTab === feedTab) return;

    if (newTab === 'following' && !currentUser) {
      navigate('/login');
      return;
    }

    setFeedTab(newTab);
    setPosts([]);
    setPage(1);
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter((p) => p._id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 flex justify-center">
      {/* Center Feed Column */}
      <div className="flex-1 max-w-2xl border-x border-zinc-800 min-h-screen bg-black">
        {/* Sticky Header with Twitter Tabs: For You vs Following (50% each on mobile) */}
        <div className="sticky top-14 z-20 bg-black/85 backdrop-blur-md border-b border-zinc-800">
          <div className="flex w-full items-stretch justify-center">
            {/* For You Tab */}
            <button
              onClick={() => handleTabChange('forYou')}
              className={`w-1/2 py-3.5 text-center text-sm font-bold transition relative flex items-center justify-center min-h-[44px] ${
                feedTab === 'forYou'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>For You</span>
              {feedTab === 'forYou' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-sky-400 rounded-full" />
              )}
            </button>

            {/* Following Tab */}
            <button
              onClick={() => handleTabChange('following')}
              className={`w-1/2 py-3.5 text-center text-sm font-bold transition relative flex items-center justify-center min-h-[44px] ${
                feedTab === 'following'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>Following</span>
              {feedTab === 'following' && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-sky-400 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop only: Inline Composer (hidden on mobile, opens via FAB on mobile) */}
        <div className="hidden md:block">
          <CreatePostBox onPostCreated={handlePostCreated} />
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="divide-y divide-zinc-900">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center space-y-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchPosts(1, false, feedTab)}
              className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full min-h-[44px]"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3 px-6">
            {feedTab === 'following' ? (
              <>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-sky-400">
                  <UserCheck className="w-8 h-8" />
                </div>
                <p className="text-base font-bold text-white">No posts in your Following feed</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  You aren't following anyone yet, or the people you follow haven't posted anything recently. Check out Search to discover accounts!
                </p>
                <button
                  onClick={() => handleTabChange('forYou')}
                  className="mt-2 text-xs bg-white hover:bg-zinc-200 text-black font-semibold px-4 py-2 rounded-full transition min-h-[44px]"
                >
                  Switch to For You
                </button>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-white">Welcome to the timeline!</p>
                <p className="text-xs text-zinc-500">
                  No posts yet. Be the first to share an update!
                </p>
              </>
            )}
          </div>
        ) : (
          /* Posts Feed */
          <div className="divide-y divide-zinc-900">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={handlePostDeleted}
                onUpdate={handlePostUpdated}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => fetchPosts(page + 1, true, feedTab)}
                  disabled={loadingMore}
                  className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sky-400 hover:text-sky-300 text-xs font-semibold rounded-full transition flex items-center justify-center space-x-2 mx-auto min-h-[44px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load more posts</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar on Desktop (hidden on mobile, reachable on mobile via /search) */}
      <div className="hidden lg:block w-80 pl-6 sticky top-14 h-fit">
        <WhoToFollow />
      </div>

      {/* Mobile Floating Action Button (FAB) for Composer */}
      {currentUser && (
        <button
          onClick={() => setIsComposerOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 bg-sky-500 hover:bg-sky-400 active:scale-95 text-white p-3.5 rounded-full shadow-2xl transition-all duration-200 flex items-center justify-center min-w-[56px] min-h-[56px] shadow-sky-500/20"
          aria-label="Compose tweet"
        >
          <Feather className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Composer Modal / Full Screen Sheet */}
      <ComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
