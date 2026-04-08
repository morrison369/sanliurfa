import React, { useState, useEffect } from 'react';
import { Heart, Share2, MessageCircle } from 'lucide-react';

interface SocialInteractionsProps {
  placeId: string;
  userId?: string;
}

export default function SocialInteractions({ placeId, userId }: SocialInteractionsProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const likeRes = await fetch(`/api/places/${placeId}/like`);
      const shareRes = await fetch(`/api/places/${placeId}/share`);
      if (likeRes.ok && shareRes.ok) {
        const likeData = await likeRes.json();
        const shareData = await shareRes.json();
        setLikeCount(likeData.data.count);
        setHasLiked(likeData.data.hasLiked);
        setShareCount(shareData.data.count);
      }
    };
    fetch();
  }, [placeId]);

  const handleLike = async () => {
    if (!userId) return;
    const res = await fetch(`/api/places/${placeId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: hasLiked ? 'unlike' : 'like' }),
    });
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.data.count);
      setHasLiked(!hasLiked);
    }
  };

  const handleShare = async () => {
    if (!userId) return;
    const shareUrl = window.location.href;
    await fetch(`/api/places/${placeId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'web', share_url: shareUrl }),
    });
  };

  return (
    <div className="flex gap-4 items-center">
      <button onClick={handleLike} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${hasLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
        <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
        <span className="text-sm font-medium">{likeCount}</span>
      </button>
      <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
        <Share2 className="w-5 h-5" />
        <span className="text-sm font-medium">{shareCount}</span>
      </button>
    </div>
  );
}
