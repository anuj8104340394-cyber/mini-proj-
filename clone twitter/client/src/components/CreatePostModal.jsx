import React from 'react';
import { X } from 'lucide-react';
import TweetBox from './TweetBox';

export default function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-200">New Civic Report / Complaint</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <TweetBox
          placeholder="Describe the issue, location details, or municipal complaint..."
          onPostCreated={(post) => {
            if (onPostCreated) onPostCreated(post);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
