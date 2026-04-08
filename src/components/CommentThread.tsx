import React, { useState, useEffect } from 'react';

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_level: number;
  content: string;
  helpful_count: number;
  unhelpful_count: number;
  user_vote?: 'helpful' | 'unhelpful' | null;
  reply_count: number;
  created_at: string;
  target_type: string;
  target_id: string;
  parent_comment_id?: string;
}

interface CommentThreadProps {
  targetType: string;
  targetId: string;
  currentUserId?: string;
}

export default function CommentThread({ targetType, targetId, currentUserId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/comments?targetType=${targetType}&targetId=${targetId}&limit=50`
      );

      if (!response.ok) {
        throw new Error('Yorumlar yüklenemedi');
      }

      const data = await response.json();
      setComments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, parentCommentId?: string) => {
    e.preventDefault();

    if (!newComment.trim() || !currentUserId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          content: newComment.trim(),
          parentCommentId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Yorum yazılamadı');
      }

      setNewComment('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, voteType: 'helpful' | 'unhelpful') => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        await loadComments();
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins}dk`;
    if (diffHours < 24) return `${diffHours}s`;
    return date.toLocaleDateString('tr-TR');
  };

  const renderCommentItem = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-4 pt-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : 'p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <a href={`/kullanıcı/${comment.user_id}`} className="flex items-center gap-2 hover:opacity-75">
            {comment.user_avatar ? (
              <img
                src={comment.user_avatar}
                alt={comment.user_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
                {comment.user_name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {comment.user_name}
              </p>
              {comment.user_level > 1 && (
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Lv{comment.user_level}
                </p>
              )}
            </div>
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(comment.created_at)}
        </p>
      </div>

      {/* Content */}
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
        {comment.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={() => handleVote(comment.id, 'helpful')}
          disabled={!currentUserId}
          className={`flex items-center gap-1 px-2 py-1 rounded ${
            comment.user_vote === 'helpful'
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          } transition-colors`}
        >
          👍 {comment.helpful_count}
        </button>

        <button
          onClick={() => handleVote(comment.id, 'unhelpful')}
          disabled={!currentUserId}
          className={`flex items-center gap-1 px-2 py-1 rounded ${
            comment.user_vote === 'unhelpful'
              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          } transition-colors`}
        >
          👎 {comment.unhelpful_count}
        </button>

        {comment.reply_count > 0 && (
          <button
            onClick={() => {
              const newExpanded = new Set(expandedReplies);
              if (newExpanded.has(comment.id)) {
                newExpanded.delete(comment.id);
              } else {
                newExpanded.add(comment.id);
              }
              setExpandedReplies(newExpanded);
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expandedReplies.has(comment.id) ? '▼' : '▶'} {comment.reply_count} yanıt
          </button>
        )}

        {currentUserId === comment.user_id && (
          <button
            onClick={() => handleDeleteComment(comment.id)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            Sil
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* New Comment Form */}
      {currentUserId && (
        <form onSubmit={(e) => handleSubmitComment(e)} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Bir yorum yazın
          </p>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Düşüncelerinizi paylaşın..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none mb-3"
            rows={3}
            maxLength={5000}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {newComment.length}/5000
            </p>
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Yorumlar yükleniyor...</p>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && comments.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Henüz yorum yok</p>
          <p className="text-sm mt-1">İlk yorumu siz yazın!</p>
        </div>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {renderCommentItem(comment)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
