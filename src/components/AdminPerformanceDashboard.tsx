import React, { useState, useEffect } from 'react';

interface PerformanceData {
  performance: {
    stats: any;
    pages: any[];
    connectionTypes: any[];
    database: any;
  };
  recommendations: any[];
  lastUpdated: string;
}

export default function AdminPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, recsRes] = await Promise.all([
          fetch('/api/admin/performance/summary'),
          fetch('/api/admin/performance/recommendations')
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setData(summaryData.data);
        }

        if (recsRes.ok) {
          const recsData = await recsRes.json();
          setRecommendations(recsData.data.recommendations);
        }
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading performance data...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-red-600">Failed to load performance data</div>;
  }

  const stats = data.performance.stats || {};
  const avgLcp = stats.avg_lcp ? Math.round(stats.avg_lcp) : 0;
  const avgTtfb = stats.avg_ttfb ? Math.round(stats.avg_ttfb) : 0;
  const avgFcp = stats.avg_fcp ? Math.round(stats.avg_fcp) : 0;

  const getLcpStatus = (lcp: number) => {
    if (lcp <= 2500) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Good' };
    if (lcp <= 4000) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Needs Work' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Poor' };
  };

  const getTtfbStatus = (ttfb: number) => {
    if (ttfb <= 600) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Good' };
    if (ttfb <= 1200) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Fair' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Poor' };
  };

  const lcpStatus = getLcpStatus(avgLcp);
  const ttfbStatus = getTtfbStatus(avgTtfb);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        {['summary', 'pages', 'connections', 'recommendations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-6 rounded-lg ${lcpStatus.bg}`}>
              <h3 className="text-sm font-semibold mb-2">LCP (Largest Contentful Paint)</h3>
              <p className={`text-3xl font-bold ${lcpStatus.color}`}>{avgLcp}ms</p>
              <p className={`text-sm mt-2 ${lcpStatus.color}`}>{lcpStatus.label}</p>
              <p className="text-xs text-gray-600 mt-2">Target: &lt;2500ms</p>
            </div>

            <div className={`p-6 rounded-lg ${ttfbStatus.bg}`}>
              <h3 className="text-sm font-semibold mb-2">TTFB (Time to First Byte)</h3>
              <p className={`text-3xl font-bold ${ttfbStatus.color}`}>{avgTtfb}ms</p>
              <p className={`text-sm mt-2 ${ttfbStatus.color}`}>{ttfbStatus.label}</p>
              <p className="text-xs text-gray-600 mt-2">Target: &lt;600ms</p>
            </div>

            <div className="p-6 rounded-lg bg-blue-50">
              <h3 className="text-sm font-semibold mb-2">FCP (First Contentful Paint)</h3>
              <p className="text-3xl font-bold text-blue-600">{avgFcp}ms</p>
              <p className="text-sm mt-2 text-blue-600">Good</p>
              <p className="text-xs text-gray-600 mt-2">Target: &lt;1800ms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-4">Database Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Connections</span>
                  <span className="font-semibold">{data.performance.database?.activeConnections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cache Hit Ratio</span>
                  <span className="font-semibold">{data.performance.database?.cacheHitRatio || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-4">Violations (24h)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">LCP Violations</span>
                  <span className={`font-semibold ${stats.lcp_fails > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.lcp_fails || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Page</th>
                <th className="px-4 py-3 text-left font-semibold">Samples</th>
                <th className="px-4 py-3 text-left font-semibold">Avg LCP</th>
                <th className="px-4 py-3 text-left font-semibold">Violations</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.pages.map((page: any, idx: number) => (
                <tr key={idx} className="border-t border-gray-200">
                  <td className="px-4 py-3 truncate text-gray-600">{page.url}</td>
                  <td className="px-4 py-3 font-semibold">{page.samples}</td>
                  <td className={`px-4 py-3 font-semibold ${page.avg_lcp > 2500 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.round(page.avg_lcp)}ms
                  </td>
                  <td className={`px-4 py-3 font-semibold ${page.lcp_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {page.lcp_violations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.map((rec: any, idx: number) => (
            <div key={idx} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="font-semibold">Category: {rec.category}</p>
                    <p className="text-gray-600">Impact: {rec.estimatedImpact}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
