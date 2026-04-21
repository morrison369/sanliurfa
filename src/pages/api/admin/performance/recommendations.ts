/**
 * Performance Optimization Recommendations
 * GET: Get detailed optimization recommendations based on current metrics
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  estimatedImpact: string;
  action: string;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check admin access
    if (!locals.user || locals.user.role !== 'admin') {
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN
      );
    }

    const recommendations: Recommendation[] = [];

    // Check for missing indexes
    try {
      const unusedIndexes = await queryMany(`
        SELECT schemaname, tablename, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 AND idx_tup_read = 0
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 5
      `);

      if (unusedIndexes.rows && unusedIndexes.rows.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'Veritabanı İndeksleri',
          title: `${unusedIndexes.rows.length} Kullanılmayan İndeks Bulundu`,
          description: `Hiç kullanılmayan ${unusedIndexes.rows.length} indeks bulundu. Kaldırılması disk alanı açar ve yazma işlemlerini hızlandırır.`,
          estimatedImpact: 'Orta - Yazma performansını iyileştirir',
          action: `DROP INDEX IF EXISTS ${unusedIndexes.rows.map((r: any) => r.indexname).join(', ')};`
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check for large tables without indexes
    try {
      const largeUnindexedTables = await queryMany(`
        SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE pg_indexes.tablename = pg_tables.tablename
        )
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5
      `);

      if (largeUnindexedTables.rows && largeUnindexedTables.rows.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'Veritabanı İndeksleri',
          title: 'İndeksi Olmayan Büyük Tablolar',
          description: `İndeksi olmayan büyük tablolar bulundu. Sorgu performansını artırmak için sık sorgulanan kolonlara indeks ekleyin.`,
          estimatedImpact: 'Yüksek - Sorgu performansında belirgin iyileşme',
          action: 'Sık sorgulanan kolonları incele ve uygun indeksleri oluştur'
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check for dead rows
    try {
      const deadRowStats = await queryOne(`
        SELECT
          SUM(n_dead_tup) as total_dead_rows,
          SUM(n_live_tup) as total_live_rows,
          COUNT(*) as table_count
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
      `);

      if (deadRowStats && deadRowStats.total_dead_rows > 10000) {
        recommendations.push({
          priority: 'medium',
          category: 'Veritabanı Bakımı',
          title: `${Math.round(deadRowStats.total_dead_rows / 1000)}K Ölü Satır`,
          description: 'Yüksek sayıda ölü satır tespit edildi. Depolama alanını geri kazanmak ve performansı artırmak için VACUUM çalıştırın.',
          estimatedImpact: 'Orta - Daha iyi depolama kullanımı',
          action: 'VACUUM ANALYZE; -- Düşük trafik döneminde çalıştır'
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Check query performance
    try {
      const slowQueries = await queryMany(`
        SELECT query, mean_time, calls
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 5
      `);

      if (slowQueries.rows && slowQueries.rows.length > 0) {
        const avgTime = slowQueries.rows.reduce((sum: number, q: any) => sum + q.mean_time, 0) / slowQueries.rows.length;
        recommendations.push({
          priority: avgTime > 500 ? 'high' : 'medium',
          category: 'Sorgu Performansı',
          title: `${slowQueries.rows.length} Yavaş Sorgu Tespit Edildi`,
          description: `Ortalama çalışma süresi 100ms üzerinde olan ${slowQueries.rows.length} sorgu bulundu. Uygun indeksler ve sorgu düzenlemeleriyle optimize edin.`,
          estimatedImpact: 'Yüksek - Yanıt süresinde belirgin iyileşme',
          action: 'Darboğazları bulmak ve eksik indeksleri eklemek için EXPLAIN ANALYZE kullan'
        });
      }
    } catch (e) {
      // pg_stat_statements may not be enabled
    }

    // Check cache configuration
    try {
      const connections = await queryOne(`
        SELECT count(*) as connection_count FROM pg_stat_activity
      `);

      if (connections && connections.connection_count > 15) {
        recommendations.push({
          priority: 'medium',
          category: 'Bağlantı Yönetimi',
          title: 'Yüksek Bağlantı Sayısı',
          description: 'Şu anda çok sayıda veritabanı bağlantısı kullanılıyor. Redis önbellek TTL sürelerini artırmayı veya sorgu sonucu önbelleklemesini değerlendirin.',
          estimatedImpact: 'Orta - Veritabanı yükünü azaltır',
          action: 'Koddaki Redis TTL değerlerini incele ve sabit veriler için artır'
        });
      }
    } catch (e) {
      // Error checking connections
    }

    // Add generic recommendations if none found
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'Genel',
        title: 'Veritabanı Performansı İyi Görünüyor',
        description: 'Acil optimizasyon fırsatı tespit edilmedi. Performans metriklerini izlemeye devam edin.',
        estimatedImpact: 'Düşük',
        action: 'İstemci tarafı iyileştirmeler için Core Web Vitals panelini izleyin'
      });
    }

    return apiResponse(
      {
        success: true,
        data: {
          recommendations: recommendations.sort((a, b) => {
            const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityMap[a.priority] - priorityMap[b.priority];
          }),
          lastAnalyzed: new Date().toISOString()
        }
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Performance recommendations failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Öneriler oluşturulamadı',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};
