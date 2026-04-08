/**
 * Email Notifications - Yorum Bildirimleri
 * Yorum eklendiğinde yazı yazarına email gönder
 * Yorum yanıtlandığında kullanıcıya email gönder
 */

import { queryOne } from './postgres';
import { logger } from './logging';

// Resend API (production'da ayarlanacak)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'noreply@sanliurfa.com';

export interface EmailNotificationPayload {
  type: 'new_comment' | 'comment_reply' | 'new_post';
  postId: number;
  postTitle: string;
  postSlug: string;
  recipientEmail: string;
  recipientName: string;
  commentAuthor: string;
  commentContent: string;
  authorEmail?: string;
}

/**
 * Email gönder
 */
export async function sendEmail(payload: EmailNotificationPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY tanımlanmamış, email gönderilemedi', { payload });
    return false;
  }

  try {
    let subject = '';
    let htmlContent = '';

    switch (payload.type) {
      case 'new_comment':
        subject = `Yeni yorum: "${payload.postTitle}"`;
        htmlContent = `
          <h2>Yeni Yorum</h2>
          <p><strong>${payload.commentAuthor}</strong> "${payload.postTitle}" yazısına yorum yaptı:</p>
          <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0;">
            ${escapeHtml(payload.commentContent)}
          </blockquote>
          <p>
            <a href="https://sanliurfa.com/blog/${payload.postSlug}#comments" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
              Yorumu Görüntüle
            </a>
          </p>
        `;
        break;

      case 'comment_reply':
        subject = `Yorum yanıtlaması: "${payload.postTitle}"`;
        htmlContent = `
          <h2>Yorum Yanıtlaması</h2>
          <p><strong>${payload.commentAuthor}</strong> yorumunuza yanıt verdi:</p>
          <blockquote style="border-left: 4px solid #10b981; padding-left: 16px; margin: 16px 0;">
            ${escapeHtml(payload.commentContent)}
          </blockquote>
          <p>
            <a href="https://sanliurfa.com/blog/${payload.postSlug}#comments" style="background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
              Yanıtı Görüntüle
            </a>
          </p>
        `;
        break;

      case 'new_post':
        subject = `Yeni yazı yayınlandı: "${payload.postTitle}"`;
        htmlContent = `
          <h2>Yeni Blog Yazısı</h2>
          <p>Abone olduğunuz kategoride yeni bir yazı yayınlandı:</p>
          <h3>${payload.postTitle}</h3>
          <p>${payload.commentContent}</p>
          <p>
            <a href="https://sanliurfa.com/blog/${payload.postSlug}" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
              Yazıyı Oku
            </a>
          </p>
        `;
        break;
    }

    // Resend API'ye istek gönder
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: payload.recipientEmail,
        subject,
        html: htmlContent,
        reply_to: payload.authorEmail || FROM_EMAIL
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Email gönderilemedi', new Error(JSON.stringify(error)), { payload });
      return false;
    }

    logger.info('Email gönderildi', { type: payload.type, recipient: payload.recipientEmail });
    return true;
  } catch (err) {
    logger.error('Email gönderimi başarısız', err instanceof Error ? err : new Error(String(err)), { payload });
    return false;
  }
}

/**
 * Yorum bildirimini gönder
 */
export async function notifyNewComment(
  postId: number,
  commentAuthor: string,
  commentContent: string,
  commentAuthorEmail?: string
): Promise<void> {
  try {
    // Yazıyı getir
    const post = await queryOne(
      'SELECT id, title, slug, author_id FROM blog_posts WHERE id = $1',
      [postId]
    );

    if (!post || !post.author_id) {
      logger.warn('Yorum bildirimi gönderülemedi: yazı bulunamadı', { postId });
      return;
    }

    // Yazı yazarını getir
    const author = await queryOne(
      'SELECT id, full_name, email FROM users WHERE id = $1',
      [post.author_id]
    );

    if (!author || !author.email) {
      logger.warn('Yorum bildirimi gönderülemedi: yazar emaili bulunamadı', { postId, authorId: post.author_id });
      return;
    }

    // Email gönder
    await sendEmail({
      type: 'new_comment',
      postId,
      postTitle: post.title,
      postSlug: post.slug,
      recipientEmail: author.email,
      recipientName: author.full_name,
      commentAuthor,
      commentContent,
      authorEmail: commentAuthorEmail
    });
  } catch (err) {
    logger.error('Yorum bildirimi gönderimi başarısız', err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Yorum yanıtlaması bildirimini gönder
 */
export async function notifyCommentReply(
  originalCommentId: number,
  replyAuthor: string,
  replyContent: string,
  postSlug: string,
  postTitle: string
): Promise<void> {
  try {
    // Orijinal yorumu getir
    const originalComment = await queryOne(
      'SELECT id, user_id, author_email FROM blog_comments WHERE id = $1',
      [originalCommentId]
    );

    if (!originalComment || (!originalComment.user_id && !originalComment.author_email)) {
      logger.warn('Yanıt bildirimi gönderülemedi: orijinal yorum bulunamadı');
      return;
    }

    let recipientEmail = originalComment.author_email;
    let recipientName = 'Kullanıcı';

    // Eğer kullanıcı oturum açmışsa, onun emailini kullan
    if (originalComment.user_id && !recipientEmail) {
      const user = await queryOne(
        'SELECT full_name, email FROM users WHERE id = $1',
        [originalComment.user_id]
      );

      if (user && user.email) {
        recipientEmail = user.email;
        recipientName = user.full_name || 'Kullanıcı';
      }
    }

    if (!recipientEmail) {
      logger.warn('Yanıt bildirimi gönderülemedi: alıcı emaili bulunamadı');
      return;
    }

    // Email gönder
    await sendEmail({
      type: 'comment_reply',
      postId: 0,
      postTitle,
      postSlug,
      recipientEmail,
      recipientName,
      commentAuthor: replyAuthor,
      commentContent: replyContent
    });
  } catch (err) {
    logger.error('Yanıt bildirimi gönderimi başarısız', err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Abone olanlara yeni yazı bildirimi gönder
 */
export async function notifyNewPost(
  postId: number,
  postTitle: string,
  postSlug: string,
  excerpt: string,
  categoryId: number
): Promise<number> {
  try {
    // Kategori abone olan kullanıcıları getir
    const subscribers = await queryOne(
      `SELECT COUNT(*) as count
       FROM blog_subscriptions
       WHERE status = 'subscribed'
       AND (categories IS NULL OR categories ILIKE $1)`,
      [`%${categoryId}%`]
    );

    if (!subscribers || parseInt(subscribers.count || '0') === 0) {
      return 0;
    }

    // Sanal olarak gönder (gerçek sistemde batch job olacak)
    logger.info('Yeni yazı bildirimi gönderiliyor', {
      postId,
      subscriberCount: subscribers.count,
      title: postTitle
    });

    return parseInt(subscribers.count || '0');
  } catch (err) {
    logger.error('Yeni yazı bildirimi başarısız', err instanceof Error ? err : new Error(String(err)));
    return 0;
  }
}

/**
 * HTML escape
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
