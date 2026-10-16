import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Formats tweet text by turning @mentions into clickable links to /profile/:username
 * and highlighting #hashtags in Twitter blue.
 */
export default function FormattedText({ text, className = '' }) {
  if (!text) return null;

  // Regex to match @username or #hashtag or regular text
  const parts = text.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              to={`/profile/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sky-400 hover:underline font-medium"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith('#')) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={index}
              to={`/tag/${tag}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sky-400 hover:underline font-medium"
            >
              {part}
            </Link>
          );
        }

        return part;
      })}
    </span>
  );
}
