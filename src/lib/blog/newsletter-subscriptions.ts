import { deleteCache } from '../cache';
import { queryOne } from '../postgres';

export async function subscribeToBlogNewsletter(email: string, categories?: string | null): Promise<{
  created: boolean;
  alreadySubscribed: boolean;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM blog_subscriptions WHERE email = $1 AND status = $2',
    [normalizedEmail, 'subscribed'],
  );

  if (existing) {
    return { created: false, alreadySubscribed: true };
  }

  await queryOne(
    `INSERT INTO blog_subscriptions (email, categories, status)
     VALUES ($1, $2, 'subscribed')
     ON CONFLICT (email)
     DO UPDATE SET
       categories = EXCLUDED.categories,
       status = 'subscribed',
       unsubscribed_at = NULL
     RETURNING id`,
    [normalizedEmail, categories || null],
  );

  await deleteCache('blog:subscriptions:count');
  return { created: true, alreadySubscribed: false };
}
