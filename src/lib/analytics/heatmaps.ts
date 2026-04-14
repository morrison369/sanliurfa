/**
 * Heatmap Analytics
 * Track user interactions and generate heatmaps
 */

import { query } from '../postgres';

export interface HeatmapEvent {
  id?: string;
  pageUrl: string;
  elementPath: string;
  x: number;
  y: number;
  type: 'click' | 'scroll' | 'move' | 'attention';
  timestamp: Date;
  sessionId: string;
  viewport: { width: number; height: number };
  deviceType: 'desktop' | 'tablet' | 'mobile';
}

export interface HeatmapData {
  pageUrl: string;
  totalEvents: number;
  uniqueVisitors: number;
  clickPoints: Array<{ x: number; y: number; intensity: number }>;
  scrollDepth: Array<{ depth: number; percentage: number }>;
  attentionMap: Array<{ x: number; y: number; time: number }>;
  deviceBreakdown: Record<string, number>;
  timeRange: { start: Date; end: Date };
}

/**
 * Track heatmap event
 */
export async function trackHeatmapEvent(event: HeatmapEvent): Promise<void> {
  await query(
    `INSERT INTO heatmap_events (page_url, element_path, x, y, type, session_id, 
                                viewport_width, viewport_height, device_type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      event.pageUrl,
      event.elementPath,
      event.x,
      event.y,
      event.type,
      event.sessionId,
      event.viewport.width,
      event.viewport.height,
      event.deviceType,
    ]
  );
}

/**
 * Get click heatmap data
 */
export async function getClickHeatmap(
  pageUrl: string,
  timeRange: { start: Date; end: Date }
): Promise<Array<{ x: number; y: number; intensity: number }>> {
  const result = await query(
    `SELECT x, y, COUNT(*) as intensity
    FROM heatmap_events
    WHERE page_url = $1 AND type = 'click'
    AND created_at >= $2 AND created_at <= $3
    GROUP BY x, y ORDER BY intensity DESC`,
    [pageUrl, timeRange.start, timeRange.end]
  );

  return result.rows.map(row => ({
    x: parseInt(row.x),
    y: parseInt(row.y),
    intensity: parseInt(row.intensity),
  }));
}

/**
 * Get complete heatmap data
 */
export async function getCompleteHeatmap(
  pageUrl: string,
  timeRange: { start: Date; end: Date }
): Promise<HeatmapData> {
  const [eventsResult, visitorsResult, deviceResult] = await Promise.all([
    query(
      `SELECT COUNT(*) as total FROM heatmap_events 
       WHERE page_url = $1 AND created_at >= $2 AND created_at <= $3`,
      [pageUrl, timeRange.start, timeRange.end]
    ),
    query(
      `SELECT COUNT(DISTINCT session_id) as unique FROM heatmap_events 
       WHERE page_url = $1 AND created_at >= $2 AND created_at <= $3`,
      [pageUrl, timeRange.start, timeRange.end]
    ),
    query(
      `SELECT device_type, COUNT(*) as count FROM heatmap_events 
       WHERE page_url = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY device_type`,
      [pageUrl, timeRange.start, timeRange.end]
    ),
  ]);

  const clickPoints = await getClickHeatmap(pageUrl, timeRange);

  const deviceBreakdown: Record<string, number> = {};
  deviceResult.rows.forEach(row => {
    deviceBreakdown[row.device_type] = parseInt(row.count);
  });

  return {
    pageUrl,
    totalEvents: parseInt(eventsResult.rows[0].total),
    uniqueVisitors: parseInt(visitorsResult.rows[0].unique),
    clickPoints,
    scrollDepth: [],
    attentionMap: [],
    deviceBreakdown,
    timeRange,
  };
}

/**
 * Get top pages by interaction
 */
export async function getTopPagesByInteraction(
  limit: number = 10
): Promise<Array<{ pageUrl: string; interactions: number }>> {
  const result = await query(
    `SELECT page_url, COUNT(*) as interactions
    FROM heatmap_events
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY page_url
    ORDER BY interactions DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    pageUrl: row.page_url,
    interactions: parseInt(row.interactions),
  }));
}

/**
 * Clean old heatmap data
 */
export async function cleanOldHeatmapData(retentionDays: number = 90): Promise<number> {
  const result = await query(
    `DELETE FROM heatmap_events WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    RETURNING id`,
    []
  );

  return result.rows.length;
}
