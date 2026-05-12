/**
 * Performance Monitoring — Web Vitals client-side RUM
 *
 * `web-vitals` library (~3KB gzipped, Google official) ile Core Web Vitals
 * (CLS, INP, LCP) + ek metrik (FCP, TTFB) toplar; `navigator.sendBeacon`
 * kullanarak `/api/analytics/performance` endpoint'ine gönderir.
 *
 * - **CLS** (Cumulative Layout Shift): visual stability, threshold 0.1
 * - **INP** (Interaction to Next Paint): responsiveness, replaced FID in 2024
 * - **LCP** (Largest Contentful Paint): loading, threshold 2.5s
 * - **FCP** (First Contentful Paint): perceived load
 * - **TTFB** (Time to First Byte): server response time
 *
 * `client_performance_metrics` table'a yazılır, admin dashboard'da p75/p95.
 */

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

function sendMetric(metric: Metric) {
 if (typeof window === 'undefined') return;
 if (!Number.isFinite(metric.value)) return;

 const payload = JSON.stringify({
 name: metric.name,
 value: metric.value,
 url: window.location.pathname,
 });

 try {
 if (navigator.sendBeacon) {
 const blob = new Blob([payload], { type: 'application/json' });
 navigator.sendBeacon('/api/analytics/performance', blob);
 } else {
 void fetch('/api/analytics/performance', {
 method: 'POST',
 body: payload,
 headers: { 'Content-Type': 'application/json' },
 keepalive: true,
 }).catch(() => {});
 }
 } catch {
 /* swallow — telemetri hatası asla user-facing olmamalı */
 }
}

export default function PerformanceMonitor() {
 useEffect(() => {
 if (typeof window === 'undefined') return;

 onCLS(sendMetric);
 onINP(sendMetric);
 onLCP(sendMetric);
 onFCP(sendMetric);
 onTTFB(sendMetric);
 }, []);

 return null;
}
