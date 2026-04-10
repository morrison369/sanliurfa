import { describe, expect, it } from 'vitest';
import { streamJoiner, streamProcessor } from '../stream-analytics';

describe('stream-analytics', () => {
  it('derives live stream metrics from ingested records', () => {
    const streamId = streamProcessor.createStream('orders');

    streamProcessor.addRecord(streamId, { orderId: 1, amount: 100, eventTime: Date.now() - 1000 });
    streamProcessor.addRecord(streamId, { orderId: 2, amount: 150, eventTime: Date.now() - 500 });

    const metrics = streamProcessor.getStreamMetrics(streamId);

    expect(metrics.recordCount).toBe(2);
    expect(metrics.throughput).toBeGreaterThan(0);
    expect(metrics.latency).toBeGreaterThanOrEqual(0);
    expect(metrics.watermarkLag).toBeGreaterThanOrEqual(0);
  });

  it('reports actual join match rate', () => {
    streamJoiner.join(
      [
        { customerId: 1, amount: 10 },
        { customerId: 2, amount: 20 }
      ],
      [{ customerId: 1, name: 'Alice' }],
      {
        leftKey: 'customerId',
        rightKey: 'customerId',
        type: 'left'
      }
    );

    const joinId = streamJoiner.getLatestJoinId();
    expect(joinId).toBeTruthy();

    const stats = streamJoiner.getJoinStatistics(joinId as string);
    expect(stats.matchRate).toBe(0.5);
  });
});
