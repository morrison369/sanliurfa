/**
 * Social Share Button Component
 */

import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
}

export default function ShareButton({ title, url, description, imageUrl }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareOptions = [
    {
      name: 'Facebook',
      icon: '👍',
      action: () => {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'Twitter',
      icon: '𝕏',
      action: () => {
        const text = `${title} - ${description || ''}`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      action: () => {
        const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      action: () => {
        const text = `${title}\n${url}`;
        const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank');
      }
    },
    {
      name: 'Kopya',
      icon: '📋',
      action: () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  ];

  // Try to use native share API if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        });
        return;
      } catch (err) {
        // Fallback to menu if user cancels
      }
    }
    setShowMenu(!showMenu);
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        <Share2 className="w-4 h-4" />
        Paylaş
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {shareOptions.map(option => (
              <button
                key={option.name}
                onClick={() => {
                  option.action();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <span>{option.icon}</span>
                <span>{option.name}</span>
                {copied && option.name === 'Kopya' && <Check className="w-4 h-4 ml-auto text-green-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
