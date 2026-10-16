import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Loader2,
  AlertCircle,
  FileText,
  Heart,
  Camera,
  X,
  Edit3,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import UserListModal from '../components/UserListModal';

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUserProfile } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // User list modal (Followers/Following)
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [userListTab, setUserListTab] = useState('followers');

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const avatarInputRef = useRef(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usersAPI.getProfile(username);
      if (res.data.success) {
        const u = res.data.user;
        setProfileData(u);
        setPosts(res.data.posts || []);
        setStats(res.data.stats || { totalPosts: 0, totalLikes: 0 });
        setIsFollowing(u.isFollowing || false);
        setFollowersCount(u.followersCount || 0);
        setFollowingCount(u.followingCount || 0);

        // Prepopulate edit form
        setEditName(u.name || '');
        setEditUsername(u.username || '');
        setEditBio(u.bio || '');
        setAvatarPreview(u.avatar || '');
      }
    } catch (err) {
      setError('User profile not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  // Handle Follow / Unfollow
  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setFollowLoading(true);
    try {
      const res = await usersAPI.toggleFollow(username);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowersCount(res.data.followersCount);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle Avatar Change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setEditError('Avatar image must be under 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setEditError('');
    }
  };

  const handleOpenEditModal = () => {
    if (profileData) {
      setEditName(profileData.name || '');
      setEditUsername(profileData.username || '');
      setEditBio(profileData.bio || '');
      setAvatarPreview(profileData.avatar || '');
    }
    setAvatarFile(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setAvatarFile(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    setEditError('');
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Name cannot be empty');
      return;
    }

    if (!editUsername.trim()) {
      setEditError('Username cannot be empty');
      return;
    }

    // Strict Password validation
    const hasPasswordInput = Boolean(
      (currentPassword && currentPassword.trim()) ||
      (newPassword && newPassword.trim()) ||
      (confirmPassword && confirmPassword.trim())
    );

    if (hasPasswordInput) {
      if (!currentPassword || !currentPassword.trim()) {
        setEditError('Please enter your current password to verify your identity');
        setShowPasswordSection(true);
        return;
      }
      if (!newPassword || !newPassword.trim()) {
        setEditError('Please enter a new password');
        setShowPasswordSection(true);
        return;
      }
      if (newPassword.trim().length < 6) {
        setEditError('New password must be at least 6 characters long');
        setShowPasswordSection(true);
        return;
      }
      if (newPassword !== confirmPassword) {
        setEditError('New password and confirm password do not match');
        setShowPasswordSection(true);
        return;
      }
      if (currentPassword === newPassword) {
        setEditError('New password cannot be the same as your current password');
        setShowPasswordSection(true);
        return;
      }
    }

    setUpdating(true);
    setEditError('');

    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('username', editUsername.trim().toLowerCase());
      formData.append('bio', editBio.trim());

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      if (hasPasswordInput) {
        formData.append('currentPassword', currentPassword.trim());
        formData.append('newPassword', newPassword.trim());
      }

      const res = await usersAPI.updateProfile(formData);
      if (res.data.success) {
        const updatedUser = res.data.user;
        const usernameChanged = updatedUser.username !== username;

        setProfileData((prev) => ({
          ...prev,
          name: updatedUser.name,
          username: updatedUser.username,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar
        }));

        updateUserProfile(updatedUser);
        handleCloseEditModal();

        setSuccessToast(
          usernameChanged
            ? `Profile & username updated to @${updatedUser.username}!`
            : 'Profile updated successfully!'
        );
        setTimeout(() => setSuccessToast(''), 3500);

        if (usernameChanged) {
          navigate(`/profile/${updatedUser.username}`, { replace: true });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setEditError(msg);
      if (msg.toLowerCase().includes('password')) {
        setShowPasswordSection(true);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter((p) => p._id !== postId));
    setStats((prev) => ({
      ...prev,
      totalPosts: Math.max(0, prev.totalPosts - 1)
    }));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen p-12 flex justify-center items-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen p-8 text-center text-zinc-400">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-2">User Not Found</h2>
        <p className="text-xs text-zinc-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-full"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const isSelf = profileData.isSelf || (currentUser && currentUser.username === profileData.username);
  const joinedDate = profileData.createdAt
    ? format(new Date(profileData.createdAt), 'MMMM yyyy')
    : 'Recently';

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800 min-h-screen bg-black">
      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-sky-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="sticky top-14 z-20 bg-black/85 backdrop-blur-md px-3 py-2 border-b border-zinc-800 flex items-center space-x-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-1.5">
            <span>{profileData.name}</span>
            {profileData.role === 'admin' && (
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            )}
          </h2>
          <span className="text-xs text-zinc-500">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="h-32 bg-gradient-to-r from-sky-950 via-zinc-900 to-black border-b border-zinc-800" />

      {/* User Details */}
      <div className="px-4 pb-4 border-b border-zinc-800">
        <div className="flex justify-between items-end -mt-14 mb-3">
          <img
            src={
              profileData.avatar ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${profileData.username}`
            }
            alt={profileData.name}
            className="w-28 h-28 rounded-full border-4 border-black bg-zinc-900 object-cover shadow-xl"
          />

          {/* Action Button: Edit Profile OR Follow/Following */}
          <div>
            {isSelf ? (
              <button
                onClick={handleOpenEditModal}
                className="bg-black hover:bg-zinc-900 text-white font-semibold text-xs px-4 py-2 rounded-full border border-zinc-700 transition flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit profile</span>
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`font-semibold text-xs px-5 py-2 rounded-full transition ${
                  isFollowing
                    ? 'bg-black hover:bg-rose-950/30 text-white hover:text-rose-400 border border-zinc-700 hover:border-rose-900'
                    : 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-2" />
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white">{profileData.name}</h1>
            {profileData.role === 'admin' && (
              <span className="text-[10px] bg-sky-500/10 text-sky-400 font-semibold px-2 py-0.5 rounded border border-sky-500/20">
                ADMIN
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">@{profileData.username}</p>

          {profileData.bio && (
            <p className="text-sm text-zinc-200 mt-2 leading-relaxed break-words whitespace-pre-line">
              {profileData.bio}
            </p>
          )}

          <div className="flex items-center space-x-4 text-xs text-zinc-500 pt-2">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {joinedDate}</span>
            </div>
          </div>

          {/* Followers & Following Counts (Twitter Exact Style) */}
          <div className="flex items-center space-x-4 pt-2 text-xs">
            <button
              onClick={() => {
                setUserListTab('following');
                setIsUserListOpen(true);
              }}
              className="hover:underline cursor-pointer flex items-center focus:outline-none"
            >
              <span className="font-bold text-white mr-1">{followingCount}</span>
              <span className="text-zinc-500">Following</span>
            </button>
            <button
              onClick={() => {
                setUserListTab('followers');
                setIsUserListOpen(true);
              }}
              className="hover:underline cursor-pointer flex items-center focus:outline-none"
            >
              <span className="font-bold text-white mr-1">{followersCount}</span>
              <span className="text-zinc-500">{followersCount === 1 ? 'Follower' : 'Followers'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center space-x-6 pt-3 text-xs border-t border-zinc-900 mt-3">
            <div className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">{stats.totalPosts}</span>
              <span className="text-zinc-500">Posts</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-white">{stats.totalLikes}</span>
              <span className="text-zinc-500">Likes Received</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4 sticky top-0 bg-zinc-950 z-10">
              <h3 className="text-base font-bold text-white">Edit Profile & Account</h3>
              <button
                onClick={handleCloseEditModal}
                className="text-zinc-400 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="text-xs text-rose-400 mb-3 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Upload with Preview */}
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-900 object-cover"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="profile-avatar-input"
                  />
                  <label
                    htmlFor="profile-avatar-input"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-80 group-hover:opacity-100 transition"
                    title="Change profile picture"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </label>
                </div>
                <div>
                  <label
                    htmlFor="profile-avatar-input"
                    className="text-xs font-semibold text-sky-400 hover:underline cursor-pointer block"
                  >
                    Upload New Profile Picture
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Uploaded online to Cloudinary
                  </span>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Username Input (New Feature) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Username
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    @{editUsername}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-zinc-500 text-sm">@</span>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-black border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Letters, numbers, and underscores only.
                </span>
              </div>

              {/* Bio Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Bio
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {editBio.length}/160
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={160}
                  placeholder="Tell the world about yourself..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              {/* Change Password Collapsible Section */}
              <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-black/40">
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="w-full p-3 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition"
                >
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Change Password (Optional)</span>
                  </div>
                  {showPasswordSection ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {showPasswordSection && (
                  <div className="p-3 pt-0 space-y-3 border-t border-zinc-800/60 mt-1">
                    {editError && editError.toLowerCase().includes('password') && (
                      <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-2.5 rounded-lg flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-medium">{editError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Current Password <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setEditError('');
                        }}
                        className={`w-full bg-zinc-900 border ${
                          editError && editError.toLowerCase().includes('current password')
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-zinc-800 focus:border-sky-500'
                        } rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        New Password (min 6 characters) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setEditError('');
                        }}
                        className={`w-full bg-zinc-900 border ${
                          editError && editError.toLowerCase().includes('new password')
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-zinc-800 focus:border-sky-500'
                        } rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none`}
                      />
                      {newPassword && newPassword.length < 6 && (
                        <span className="text-[10px] text-amber-400 mt-1 block">
                          Must be at least 6 characters ({newPassword.length}/6)
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Confirm New Password <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setEditError('');
                        }}
                        className={`w-full bg-zinc-900 border ${
                          confirmPassword && newPassword !== confirmPassword
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-zinc-800 focus:border-sky-500'
                        } rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none`}
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <span className="text-[10px] text-rose-400 mt-1 block">
                          Passwords do not match
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-900 sticky bottom-0 bg-zinc-950 py-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs px-5 py-1.5 rounded-full transition flex items-center space-x-1"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mx-2" />
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Followers & Following List Modal */}
      <UserListModal
        isOpen={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
        initialTab={userListTab}
        username={profileData?.username}
        onFollowCountChange={(targetUsername, nextState) => {
          if (currentUser && currentUser.username === profileData?.username) {
            setFollowingCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
          }
        }}
      />

      {/* User Posts List */}
      <div>
        <div className="px-4 py-2.5 border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Posts by @{profileData.username}
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            @{profileData.username} hasn't posted anything yet.
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
