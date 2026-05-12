/**
 * Web Vitals Admin Dashboard Card
 *
 * Migration 168 ile eklenen CLS + INP kolonlarını + diğer Core Web Vitals (LCP, FCP, TTFB)
 * `/api/analytics/performance` GET endpoint'inden çeker. Google'ın resmi threshold'larına
 * göre color-coded (good/needs-improvement/poor) gösterir.
 *
 * Threshold reference: https://web.dev/articles/vitals
 */

import { useEffect, useState } from 'react';

interface MetricRow {
 name: string;
 avg: number;
 p75: number;
 p95: number;
}

interface UrlBreakdownRow {
 url: string;
 samples: number;
 lcp_p75: number;
 inp_p75: number;
 cls_p75: number;
}

interface ApiResponse {
 metrics: MetricRow[];
 urlBreakdown?: UrlBreakdownRow[];
 from?: string | null;
 to?: string | null;
}

// Google Web Vitals thresholds (p75 evaluated)
const THRESHOLDS = {
 LCP: { good: 2500, poor: 4000, unit: 'ms', isScore: false },
 INP: { good: 200, poor: 500, unit: 'ms', isScore: false },
 CLS: { good: 0.1, poor: 0.25, unit: '', isScore: true },
 FCP: { good: 1800, poor: 3000, unit: 'ms', isScore: false },
 TTFB: { good: 800, poor: 1800, unit: 'ms', isScore: false },
} as const;

const CORE_VITALS = new Set(['LCP', 'INP', 'CLS']);

type Rating = 'good' | 'needs-improvement' | 'poor' | 'unknown';

function classifyMetric(name: string, p75: number): Rating {
 const t = THRESHOLDS[name as keyof typeof THRESHOLDS];
 if (!t) return 'unknown';
 if (p75 === 0) return 'unknown';
 if (p75 <= t.good) return 'good';
 if (p75 <= t.poor) return 'needs-improvement';
 return 'poor';
}

function ratingClass(r: Rating): string {
 switch (r) {
 case 'good': return 'bg-[rgba(34,197,94,0.12)] text-green-400 border-green-300 ';
 case 'needs-improvement': return 'bg-[rgba(234,179,8,0.12)] text-yellow-300 border-[rgba(234,179,8,0.3)] ';
 case 'poor': return 'bg-[rgba(239,68,68,0.1)] text-red-400 border-[rgba(239,68,68,0.3)] ';
 default: return 'bg-[rgba(184,115,51,0.06)] text-[#7A6B58] border-[rgba(184,115,51,0.25)] #4A3828]';
 }
}

function ratingLabel(r: Rating): string {
 switch (r) {
 case 'good': return 'İyi';
 case 'needs-improvement': return 'Geliştirilmeli';
 case 'poor': return 'Zayıf';
 default: return '–';
 }
}

function formatValue(name: string, value: number): string {
 const t = THRESHOLDS[name as keyof typeof THRESHOLDS];
 if (!t) return String(value);
 if (t.isScore) return value.toFixed(3);
 return `${Math.round(value)}${t.unit}`;
}

export default function WebVitalsCard() {
 const [metrics, setMetrics] = useState<MetricRow[]>([]);
 const [urlBreakdown, setUrlBreakdown] = useState<UrlBreakdownRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [fromDate, setFromDate] = useState<string>(() => {
 const d = new Date();
 d.setDate(d.getDate() - 7);
 return d.toISOString().slice(0, 10);
 });
 const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

 useEffect(() => {
 let cancelled = false;
 setLoading(true);
 setError(null);

 const params = new URLSearchParams({
 from: fromDate,
 to: toDate,
 byUrl: '1',
 limit: '10',
 minSamples: '5',
 });
 fetch(`/api/analytics/performance?${params}`)
 .then(r => r.json())
 .then((data: ApiResponse) => {
 if (cancelled) return;
 setMetrics(Array.isArray(data?.metrics) ? data.metrics : []);
 setUrlBreakdown(Array.isArray(data?.urlBreakdown) ? data.urlBreakdown : []);
 setLoading(false);
 })
 .catch((err) => {
 if (cancelled) return;
 setError(err instanceof Error ? err.message : 'Veri yüklenemedi');
 setLoading(false);
 });

 return () => { cancelled = true; };
 }, [fromDate, toDate]);

 const coreMetrics = metrics.filter(m => CORE_VITALS.has(m.name));
 const supplementary = metrics.filter(m => !CORE_VITALS.has(m.name));

 return (
 <section className="bg-[var(--bg-card)] rounded-sm ring-1 ring-[rgba(184,115,51,0.1)] p-6">
 <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
 <div>
 <h3 className="text-xl font-bold text-[#1F1410]">
 Web Vitals
 </h3>
 <p className="text-sm text-[#7A6B58] mt-1">
 Real User Monitoring (RUM) — Google Core Web Vitals + ek metrikler. p75 değerleri threshold'a göre değerlendirilir.
 </p>
 </div>
 <div className="flex items-center gap-3 flex-wrap">
 <label className="flex items-center gap-2 text-sm">
 <span className="text-[#7A6B58]">Başlangıç:</span>
 <input
 type="date"
 value={fromDate}
 onChange={(e) => setFromDate(e.target.value)}
 max={toDate}
 className="px-3 py-1.5 rounded-sm border border-[rgba(184,115,51,0.25)] text-sm"
 />
 </label>
 <label className="flex items-center gap-2 text-sm">
 <span className="text-[#7A6B58]">Bitiş:</span>
 <input
 type="date"
 value={toDate}
 onChange={(e) => setToDate(e.target.value)}
 min={fromDate}
 className="px-3 py-1.5 rounded-sm border border-[rgba(184,115,51,0.25)] text-sm"
 />
 </label>
 </div>
 </header>

 {loading && (
 <div className="py-8 text-center text-[#7A6B58]">
 Yükleniyor...
 </div>
 )}

 {error && (
 <div className="py-4 px-4 bg-[rgba(239,68,68,0.1)] text-red-400 rounded-sm text-sm">
 {error}
 </div>
 )}

 {!loading && !error && metrics.length === 0 && (
 <div className="py-8 text-center text-[#7A6B58]">
 Bu tarih aralığında metric kaydı yok.
 </div>
 )}

 {!loading && !error && metrics.length > 0 && (
 <>
 {/* Core Web Vitals */}
 <div className="mb-6">
 <h4 className="text-sm font-semibold text-[#7A6B58] mb-3 uppercase tracking-wide">
 Core Web Vitals
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {coreMetrics.map((m) => {
 const rating = classifyMetric(m.name, m.p75);
 return (
 <div
 key={m.name}
 className={`p-4 rounded-sm border ${ratingClass(rating)}`}
 aria-label={`${m.name} ${ratingLabel(rating)}`}
 >
 <div className="flex items-baseline justify-between mb-2">
 <span className="text-sm font-semibold uppercase tracking-wide">{m.name}</span>
 <span className="text-xs font-medium opacity-75">{ratingLabel(rating)}</span>
 </div>
 <div className="text-2xl font-bold">{formatValue(m.name, m.p75)}</div>
 <div className="text-xs opacity-75 mt-1">
 p75 · ort {formatValue(m.name, m.avg)} · p95 {formatValue(m.name, m.p95)}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Supplementary metrics (FCP, TTFB, DCL, Load) */}
 {supplementary.length > 0 && (
 <div className="mb-6">
 <h4 className="text-sm font-semibold text-[#7A6B58] mb-3 uppercase tracking-wide">
 Ek Metrikler
 </h4>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {supplementary.map((m) => {
 const rating = classifyMetric(m.name, m.p75);
 return (
 <div
 key={m.name}
 className={`p-3 rounded-sm border ${ratingClass(rating)}`}
 >
 <div className="text-xs font-semibold uppercase tracking-wide mb-1">{m.name}</div>
 <div className="text-lg font-bold">{formatValue(m.name, m.p75)}</div>
 <div className="text-xs opacity-75">p75</div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Slowest Pages — per-URL LCP p75 breakdown */}
 {urlBreakdown.length > 0 && (
 <div>
 <h4 className="text-sm font-semibold text-[#7A6B58] mb-3 uppercase tracking-wide">
 En Yavaş Sayfalar (LCP p75'e göre, en az 5 örnek)
 </h4>
 <div className="overflow-x-auto rounded-sm border border-[rgba(184,115,51,0.14)]">
 <table className="w-full text-sm">
 <thead className="bg-[rgba(184,115,51,0.04)]/50">
 <tr>
 <th className="px-4 py-2 text-left font-semibold text-[#7A6B58]">URL</th>
 <th className="px-3 py-2 text-right font-semibold text-[#7A6B58]">Örnek</th>
 <th className="px-3 py-2 text-right font-semibold text-[#7A6B58]">LCP</th>
 <th className="px-3 py-2 text-right font-semibold text-[#7A6B58]">INP</th>
 <th className="px-3 py-2 text-right font-semibold text-[#7A6B58]">CLS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[rgba(184,115,51,0.14)]">
 {urlBreakdown.map((row) => {
 const lcpRating = classifyMetric('LCP', row.lcp_p75);
 const inpRating = classifyMetric('INP', row.inp_p75);
 const clsRating = classifyMetric('CLS', row.cls_p75);
 return (
 <tr key={row.url} className="bg-[var(--bg-card)]">
 <td className="px-4 py-2 text-[#1F1410] max-w-md">
 <code className="text-xs truncate block">{row.url}</code>
 </td>
 <td className="px-3 py-2 text-right text-[#7A6B58] tabular-nums">
 {row.samples.toLocaleString('tr-TR')}
 </td>
 <td className={`px-3 py-2 text-right font-semibold tabular-nums ${ratingClass(lcpRating)}`}>
 {formatValue('LCP', row.lcp_p75)}
 </td>
 <td className={`px-3 py-2 text-right font-semibold tabular-nums ${ratingClass(inpRating)}`}>
 {formatValue('INP', row.inp_p75)}
 </td>
 <td className={`px-3 py-2 text-right font-semibold tabular-nums ${ratingClass(clsRating)}`}>
 {formatValue('CLS', row.cls_p75)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </>
 )}
 </section>
 );
}
