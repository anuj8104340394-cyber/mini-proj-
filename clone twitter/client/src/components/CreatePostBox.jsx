import React, { useState, useRef } from 'react';
import { Image, Video, MapPin, X, Loader2, Send, AtSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { postsAPI, usersAPI } from '../services/api';
import LocationPickerModal from './LocationPickerModal';

export default function CreatePostBox({ onPostCreated }) {
  const { user, isAuthenticated } = useAuth();
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Mention autocomplete state
  const [mentionInfo, setMentionInfo] = useState(null); // { query: string, startIndex: number, cursorPos: number }
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const maxLength = 280;

  const handleMediaChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const isVid = type === 'video' || file.type.startsWith('video/');
      const maxSize = isVid ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      const sizeLabel = isVid ? '50MB' : '10MB';

      if (file.size > maxSize) {
        setError(`${isVid ? 'Video' : 'Photo'} file size must be under ${sizeLabel}`);
        return;
      }

      setMediaFile(file);
      setMediaType(isVid ? 'video' : 'image');
      setMediaPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Detect @mention trigger while typing
  const handleTextChange = async (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      const query = match[1];
      const startIndex = match.index;
      setMentionInfo({ query, startIndex, cursorPos });

      try {
        const res = await usersAPI.search(query);
        if (res.data.success) {
          setSuggestions(res.data.users || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        // silent error
      }
    } else {
      setMentionInfo(null);
      setSuggestions([]);
    }
  };

  const selectMention = (username) => {
    if (!mentionInfo) return;
    const before = text.slice(0, mentionInfo.startIndex);
    const after = text.slice(mentionInfo.cursorPos);
    const newText = `${before}@${username} ${after}`;
    setText(newText);
    setMentionInfo(null);
    setSuggestions([]);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = mentionInfo.startIndex + username.length + 2;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleKeyDown = (e) => {
    if (mentionInfo && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          selectMention(suggestions[selectedIndex].username);
        }
      } else if (e.key === 'Escape') {
        setMentionInfo(null);
        setSuggestions([]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please write something to post');
      return;
    }

    if (text.trim().length > maxLength) {
      setError(`Post cannot exceed ${maxLength} characters`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      if (location.trim()) {
        formData.append('location', location.trim());
      }
      if (mediaFile) {
        formData.append('image', mediaFile);
      }

      const res = await postsAPI.createPost(formData);
      if (res.data.success) {
        setText('');
        setLocation('');
        removeMedia();
        setMentionInfo(null);
        setSuggestions([]);
        if (onPostCreated) {
          onPostCreated(res.data.post);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 text-center text-sm text-zinc-400">
        <span>Join the conversation on Twitter! </span>
        <a href="/login" className="text-sky-400 hover:underline font-semibold ml-1">
          Log in
        </a>
        <span> or </span>
        <a href="/signup" className="text-sky-400 hover:underline font-semibold">
          Sign up
        </a>
      </div>
    );
  }

  const charsLeft = maxLength - text.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="p-4 border-b border-zinc-800 bg-black relative">
      <div className="flex space-x-3">
        <img
          src={
            user?.avatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`
          }
          alt={user?.name}
          className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 shrink-0 object-cover"
        />

        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="What is happening?! (Type @ to tag any user)"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none text-base leading-relaxed"
            />

            {/* Mention Suggestions Popover (Instagram / Twitter style) */}
            {mentionInfo && suggestions.length > 0 && (
              <div className="absolute top-24 left-0 right-0 sm:right-auto sm:w-80 z-40 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in duration-150">
                <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <AtSign className="w-3 h-3 text-sky-400" />
                    <span>Tag User</span>
                  </span>
                  <span>Use ↑↓ Enter</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/50">
                  {suggestions.map((u, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        type="button"
                        key={u.id || u._id || u.username}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectMention(u.username);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center space-x-2.5 transition ${
                          isSelected ? 'bg-sky-500/15 border-l-2 border-sky-400' : 'hover:bg-zinc-800/70'
                        }`}
                      >
                        <img
                          src={
                            u.avatar ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                          }
                          alt={u.name}
                          className="w-8 h-8 rounded-full border border-zinc-800 object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-white truncate block">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate block">
                            @{u.username}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uploaded Media Preview (Photo or Video) */}
            {mediaPreview && (
              <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-80 flex items-center justify-center">
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    controls
                    playsInline
                    className="w-full max-h-80 rounded-xl bg-black object-contain"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Attachment preview"
                    className="w-full h-auto object-cover max-h-80 rounded-xl"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white rounded-full transition z-10"
                  title="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-xs text-rose-400 mb-2 font-medium">{error}</p>
            )}

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Image Upload Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={(e) => handleMediaChange(e, 'image')}
                  className="hidden"
                  id="post-file-input"
                />
                <label
                  htmlFor="post-file-input"
                  className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-full cursor-pointer transition"
                  title="Add photo"
                >
                  <Image className="w-5 h-5" />
                </label>

                {/* Video Upload Input */}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  ref={videoInputRef}
                  onChange={(e) => handleMediaChange(e, 'video')}
                  className="hidden"
                  id="post-video-input"
                />
                <label
                  htmlFor="post-video-input"
                  className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-full cursor-pointer transition"
                  title="Add video (MP4, WebM up to 50MB)"
                >
                  <Video className="w-5 h-5" />
                </label>

                {/* Location Picker Button / Selected Pill */}
                {location ? (
                  <div className="flex items-center space-x-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2.5 py-1 rounded-full text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span
                      onClick={() => setIsLocationModalOpen(true)}
                      className="cursor-pointer hover:underline truncate max-w-[120px] sm:max-w-[180px]"
                      title={location}
                    >
                      {location}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocation('')}
                      className="text-sky-400/80 hover:text-white ml-0.5"
                      title="Remove location"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-full cursor-pointer transition flex items-center"
                    title="Add location (GPS / Popular Places)"
                  >
                    <MapPin className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Character counter & Tweet Button */}
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xs ${
                    isOverLimit
                      ? 'text-rose-500 font-bold'
                      : charsLeft <= 20
                      ? 'text-amber-400 font-semibold'
                      : 'text-zinc-500'
                  }`}
                >
                  {charsLeft}
                </span>

                <button
                  type="submit"
                  disabled={loading || !text.trim() || isOverLimit}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-1.5 rounded-full transition flex items-center space-x-1.5 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Post</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Location Picker Modal (GPS + Recommended Places) */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={(loc) => setLocation(loc)}
        currentLocation={location}
      />
    </div>
  );
}
