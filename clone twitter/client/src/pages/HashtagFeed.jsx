import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import PostCard from '../components/PostCard';
import WhoToFollow from '../components/WhoToFollow';
import { postsAPI } from '../services/api';

export default function HashtagFeed() {
  const { tag } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const cleanTag = (tag || '').toLowerCase().replace(/^#/, '');

  const fetchTagPosts = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const res = await postsAPI.getPostsByTag(cleanTag, { page: pageNum, limit: 10 });
      if (res.data.success) {
        const fetched = res.data.posts || [];
        setTotalPosts(res.data.totalPosts || fetched.length);
        if (append) {
          setPosts((prev) => [...prev, ...fetched]);
        } else {
          setPosts(fetched);
        }
        setHasMore(pageNum < res.data.totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      setError('Could not load posts for this hashtag.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTagPosts(1, false);
  }, [cleanTag]);

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter((p) => p._id !== postId));
    setTotalPosts((prev) => Math.max(0, prev - 1));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 flex justify-center">
      {/* Center Feed Column */}
      <div className="flex-1 max-w-2xl border-x border-zinc-800 min-h-screen bg-black">
        {/* Sticky Top Header */}
        <div className="sticky top-14 z-30 bg-black/80 backdrop-blur-md px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition -ml-2"
              title="Go Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center space-x-1">
                <Hash className="w-4 h-4 text-sky-400" />
                <span>{cleanTag}</span>
              </h1>
              <p className="text-xs text-zinc-500">
                {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchTagPosts(1, false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-xs">Finding #{cleanTag} posts...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center space-y-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchTagPosts(1, false)}
              className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3 px-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-sky-400">
              <Hash className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-white">No posts for #{cleanTag}</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Be the first to create a post and tag it with #{cleanTag}!
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 text-xs bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-full transition"
            >
              Go to Home Feed
            </button>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-zinc-800">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDelete={handlePostDeleted}
                  onUpdate={handlePostUpdated}
                />
              ))}
            </div>

            {/* Pagination: Load More Button */}
            {hasMore && (
              <div className="p-4 text-center border-t border-zinc-800">
                <button
                  onClick={() => fetchTagPosts(page + 1, true)}
                  disabled={loadingMore}
                  className="bg-zinc-900 hover:bg-zinc-800 text-sky-400 font-semibold text-xs px-6 py-2 rounded-full border border-zinc-800 transition"
                >
                  {loadingMore ? 'Loading more...' : 'Load more posts'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar: Who to Follow */}
      <div className="hidden lg:block w-80 pl-6 sticky top-14 h-fit">
        <WhoToFollow />
      </div>
    </div>
  );
}
