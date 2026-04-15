/**
 * Admin Dashboard Widgets
 * Stats, charts, and activity feeds for admin panel
 */

import { query } from '../postgres';

export interface DashboardStats {
  users: {
    total: number;
    newToday: number;
    activeToday: number;
  };
  places: {
    total: number;
    pending: number;
    featured: number;
  };
  reviews: {
    total: number;
    pending: number;
    avgRating: number;
  };
  blog: {
    total: number;
    published: number;
    views: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'user' | 'place' | 'review' | 'blog' | 'report';
  action: string;
  description: string;
  user?: string;
  timestamp: Date;
  link?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    usersResult,
    placesResult,
    reviewsResult,
    blogResult,
  ] = await Promise.all([
    // Users
    query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as new_today,
        COUNT(*) FILTER (WHERE last_login_at > CURRENT_DATE) as active_today
      FROM users
      WHERE is_deleted = false
    `),
    
    // Places
    query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE is_featured = true) as featured
      FROM places
    `),
    
    // Reviews
    query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COALESCE(AVG(rating), 0) as avg_rating
      FROM reviews
    `),
    
    // Blog
    query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COALESCE(SUM(views), 0) as views
      FROM blog_posts
    `),
  ]);

  return {
    users: {
      total: parseInt(usersResult.rows[0].total),
      newToday: parseInt(usersResult.rows[0].new_today),
      activeToday: parseInt(usersResult.rows[0].active_today),
    },
    places: {
      total: parseInt(placesResult.rows[0].total),
      pending: parseInt(placesResult.rows[0].pending),
      featured: parseInt(placesResult.rows[0].featured),
    },
    reviews: {
      total: parseInt(reviewsResult.rows[0].total),
      pending: parseInt(reviewsResult.rows[0].pending),
      avgRating: Math.round(parseFloat(reviewsResult.rows[0].avg_rating) * 10) / 10,
    },
    blog: {
      total: parseInt(blogResult.rows[0].total),
      published: parseInt(blogResult.rows[0].published),
      views: parseInt(blogResult.rows[0].views),
    },
  };
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const result = await query(`
    WITH combined AS (
      -- User registrations
      SELECT 
        id,
        'user' as type,
        'register' as action,
        full_name || ' kayıt oldu' as description,
        full_name as user,
        created_at as timestamp,
        NULL as link
      FROM users
      WHERE is_deleted = false
      
      UNION ALL
      
      -- New places
      SELECT 
        p.id,
        'place' as type,
        'create' as action,
        p.name || ' eklendi' as description,
        u.full_name as user,
        p.created_at as timestamp,
        '/mekan/' || p.slug as link
      FROM places p
      LEFT JOIN users u ON p.created_by = u.id
      
      UNION ALL
      
      -- New reviews
      SELECT 
        r.id,
        'review' as type,
        'review' as action,
        r.rating || ' yıldız değerlendirme' as description,
        u.full_name as user,
        r.created_at as timestamp,
        '/mekan/' || p.slug as link
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN places p ON r.place_id = p.id
      
      UNION ALL
      
      -- Blog posts
      SELECT 
        bp.id,
        'blog' as type,
        'publish' as action,
        bp.title || ' yayınlandı' as description,
        u.full_name as user,
        bp.published_at as timestamp,
        '/blog/' || bp.slug as link
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.status = 'published'
    )
    SELECT * FROM combined
    ORDER BY timestamp DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    action: row.action,
    description: row.description,
    user: row.user,
    timestamp: new Date(row.timestamp),
    link: row.link,
  }));
}

/**
 * Get traffic chart data
 */
export async function getTrafficChart(days = 7): Promise<ChartData> {
  const result = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as page_views,
      COUNT(DISTINCT user_id) as unique_users
    FROM page_views
    WHERE created_at > CURRENT_DATE - ($1 * INTERVAL '1 day')
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [days]);

  const labels = result.rows.map(r => 
    new Date(r.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })
  );

  return {
    labels,
    datasets: [
      {
        label: 'Sayfa Görüntüleme',
        data: result.rows.map(r => parseInt(r.page_views)),
        color: '#0d9488',
      },
      {
        label: 'Benzersiz Kullanıcı',
        data: result.rows.map(r => parseInt(r.unique_users)),
        color: '#6366f1',
      },
    ],
  };
}

/**
 * Get top places chart
 */
export async function getTopPlacesChart(limit = 5): Promise<ChartData> {
  const result = await query(`
    SELECT 
      name,
      review_count,
      rating
    FROM places
    ORDER BY review_count DESC
    LIMIT $1
  `, [limit]);

  return {
    labels: result.rows.map(r => r.name),
    datasets: [
      {
        label: 'Değerlendirme Sayısı',
        data: result.rows.map(r => parseInt(r.review_count)),
        color: '#0d9488',
      },
    ],
  };
}

/**
 * Get user growth chart
 */
export async function getUserGrowthChart(months = 6): Promise<ChartData> {
  const result = await query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as new_users
    FROM users
    WHERE created_at > CURRENT_DATE - ($1 * INTERVAL '1 month')
      AND is_deleted = false
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `,
      [months]);

  return {
    labels: result.rows.map(r => 
      new Date(r.month).toLocaleDateString('tr-TR', { month: 'short' })
    ),
    datasets: [
      {
        label: 'Yeni Kullanıcılar',
        data: result.rows.map(r => parseInt(r.new_users)),
        color: '#8b5cf6',
      },
    ],
  };
}

/**
 * Get moderation queue stats
 */
export async function getModerationStats(): Promise<{
  pendingPlaces: number;
  pendingReviews: number;
  pendingComments: number;
  reportedContent: number;
}> {
  const result = await query(`
    SELECT 
      (SELECT COUNT(*) FROM places WHERE status = 'pending') as pending_places,
      (SELECT COUNT(*) FROM reviews WHERE status = 'pending') as pending_reviews,
      (SELECT COUNT(*) FROM blog_comments WHERE status = 'pending') as pending_comments,
      (SELECT COUNT(*) FROM content_reports WHERE status = 'open') as reported_content
  `);

  return {
    pendingPlaces: parseInt(result.rows[0].pending_places),
    pendingReviews: parseInt(result.rows[0].pending_reviews),
    pendingComments: parseInt(result.rows[0].pending_comments),
    reportedContent: parseInt(result.rows[0].reported_content),
  };
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<{
  database: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
  disk: 'healthy' | 'degraded' | 'down';
  lastBackup?: Date;
}> {
  // Database check
  let database: 'healthy' | 'degraded' | 'down' = 'down';
  try {
    await query('SELECT 1');
    database = 'healthy';
  } catch {
    database = 'down';
  }

  // Cache check
  let cache: 'healthy' | 'degraded' | 'down' = 'down';
  try {
    const { setCache, getCache } = await import('../cache');
    await setCache('health-check', 'ok', 10);
    const val = await getCache('health-check');
    cache = val === 'ok' ? 'healthy' : 'degraded';
  } catch {
    cache = 'down';
  }

  // Last backup
  const backupResult = await query(`
    SELECT created_at FROM job_logs 
    WHERE name = 'backup' AND success = true 
    ORDER BY created_at DESC LIMIT 1
  `);

  return {
    database,
    cache,
    disk: 'healthy', // Assume healthy
    lastBackup: backupResult.rows[0]?.created_at 
      ? new Date(backupResult.rows[0].created_at) 
      : undefined,
  };
}

/**
 * Get quick actions list
 */
export function getQuickActions(): Array<{
  label: string;
  icon: string;
  link: string;
  color: string;
}> {
  return [
    { label: 'Mekan Ekle', icon: 'plus', link: '/admin/places/add', color: 'teal' },
    { label: 'Blog Yazısı', icon: 'file-text', link: '/admin/blog/add', color: 'blue' },
    { label: 'Kullanıcılar', icon: 'users', link: '/admin/users', color: 'purple' },
    { label: 'Moderasyon', icon: 'shield', link: '/admin/moderation', color: 'orange' },
    { label: 'Raporlar', icon: 'bar-chart', link: '/admin/reports', color: 'green' },
    { label: 'Ayarlar', icon: 'settings', link: '/admin/settings', color: 'gray' },
  ];
}
