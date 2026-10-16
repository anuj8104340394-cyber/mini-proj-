import React, { useState, useRef } from 'react';
import { Image, Video, MapPin, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import LocationPickerModal from './LocationPickerModal';

export default function TweetBox({ onPostCreated, placeholder = "What's the civic issue in your ward? Report here..." }) {
  const { user, isAuthenticated } = useAuth();
  const [text, setText] = useState('');
  const [ward, setWard] = useState(user?.ward || '');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleMediaChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const isVid = type === 'video' || file.type.startsWith('video/');
      const maxSize = isVid ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      const sizeLabel = isVid ? '50MB' : '10MB';

      if (file.size > maxSize) {
        setError(`${isVid ? 'Video' : 'Photo'} size exceeds ${sizeLabel} limit`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please write some details for the complaint/post');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      if (ward.trim()) {
        formData.append('ward', ward.trim());
      }
      if (mediaFile) {
        formData.append('image', mediaFile);
      }

      const res = await postsAPI.createPost(formData);
      if (res.data.success) {
        setText('');
        removeMedia();
        if (onPostCreated) {
          onPostCreated(res.data.post);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit post');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 border-b border-slate-800 bg-slate-950/60">
      <div className="flex space-x-3">
        <img
          src={
            user?.avatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`
          }
          alt={user?.name}
          className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 shrink-0"
        />

        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              rows={3}
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-base leading-relaxed"
            />

            {/* Media Preview (Photo or Video) */}
            {mediaPreview && (
              <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden max-h-72 border border-slate-800 bg-black flex items-center justify-center">
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    controls
                    playsInline
                    className="w-full max-h-72 rounded-xl bg-black object-contain"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Upload preview"
                    className="w-full h-auto object-cover max-h-72 rounded-xl"
                  />
                )}
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-xs text-rose-400 mt-1 mb-2 font-medium">
                {error}
              </p>
            )}

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Photo Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={(e) => handleMediaChange(e, 'image')}
                  className="hidden"
                  id="tweet-photo-input"
                />
                <label
                  htmlFor="tweet-photo-input"
                  className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-full cursor-pointer transition flex items-center space-x-1"
                  title="Add Photo"
                >
                  <Image className="w-5 h-5" />
                </label>

                {/* Video Upload Button */}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  ref={videoInputRef}
                  onChange={(e) => handleMediaChange(e, 'video')}
                  className="hidden"
                  id="tweet-video-input"
                />
                <label
                  htmlFor="tweet-video-input"
                  className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-full cursor-pointer transition flex items-center space-x-1"
                  title="Add Video (MP4, WebM up to 50MB)"
                >
                  <Video className="w-5 h-5" />
                </label>

                {/* Location / Ward Picker */}
                {ward ? (
                  <div className="flex items-center space-x-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2.5 py-1 rounded-full text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span
                      onClick={() => setIsLocationModalOpen(true)}
                      className="cursor-pointer hover:underline truncate max-w-[120px] sm:max-w-[160px]"
                      title={ward}
                    >
                      {ward}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWard('')}
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
                    title="Add Location (GPS / Popular Places)"
                  >
                    <MapPin className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Submit Button & Character Counter */}
              <div className="flex items-center space-x-3">
                <span className="text-[11px] text-slate-500">
                  {text.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={loading || !text.trim()}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-sky-500/20"
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
        onSelectLocation={(loc) => setWard(loc)}
        currentLocation={ward}
      />
    </div>
  );
}
