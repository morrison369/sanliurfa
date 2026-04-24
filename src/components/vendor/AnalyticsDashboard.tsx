import {  useState, useEffect  } from 'react';
interface DailyData {
  date: string;
  views: number;
  phone_clicks: number;
  direction_clicks: number;
  website_clicks: number;
}

interface AnalyticsData {
  period: string;
  summary: {
    views: { total: number; change: number };
    phoneClicks: { total: number; change: number };
    directionClicks: number;
    websiteClicks: number;
    shares: number;
    saves: number;
    activeDays: number;
  };
  daily: DailyData[];
  devices: { device_type: string; count: number }[];
  sources: { source: string; count: number }[];
  hourly: { hour: number; count: number }[];
}

interface AnalyticsDashboardProps {
  placeId: string;
}

const PERIODS = [
  { value: '7d', label: 'Son 7 Gün' },
  { value: '30d', label: 'Son 30 Gün' },
  { value: '90d', label: 'Son 90 Gün' },
  { value: '365d', label: 'Son 1 Yıl' },
];

export default function AnalyticsDashboard({ placeId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [placeId, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard?placeId=${placeId}&period=${period}`);
      if (!response.ok) throw new Error('Analitik verileri yüklenemedi.');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Analitik verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const renderBarChart = (data: DailyData[], key: keyof DailyData) => {
    if (data.length === 0) return null;
    
    const values = data.map(d => d[key] as number);
    const max = Math.max(...values, 1);
    
    return (
      <div className="h-40 flex items-end gap-1">
        {data.map((item, i) => {
          const height = ((item[key] as number) / max) * 100;
          const date = new Date(item.date);
          const label = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div 
                className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-colors"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                {label}
              </span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                {item[key]} görüntülenme
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = (data: { device_type: string; count: number }[]) => {
    if (data.length === 0) return <p className="text-gray-500 text-center py-8">Veri yok</p>;
    
    const total = data.reduce((sum, d) => sum + parseInt(d.count as any), 0);
    const colors = ['#e63946', '#f4a261', '#2a9d8f', '#264653'];
    
    let cumulativePercent = 0;
    
    return (
      <div className="flex items-center gap-8">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
            {data.map((item, i) => {
              const percent = (parseInt(item.count as any) / total) * 100;
              const dashArray = `${percent} ${100 - percent}`;
              const offset = 100 - cumulativePercent;
              cumulativePercent += percent;
              
              return (
                <circle
                  key={i}
                  cx="16"
                  cy="16"
                  r="15.9"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="8"
                  strokeDasharray={dashArray}
                  strokeDashoffset={offset}
                />
              );
            })}
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-sm text-gray-600 capitalize">{item.device_type}</span>
              </div>
              <span className="text-sm font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error || 'Bir hata oluştu'}</p>
        <button onClick={loadAnalytics} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Tekrar Dene
        </button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Analitik Paneli</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{summary.views.total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Görüntülenme</div>
          <div className={`text-xs mt-1 ${summary.views.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.views.change >= 0 ? '+' : ''}{summary.views.change}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{summary.phoneClicks.total}</div>
          <div className="text-sm text-gray-500">Telefon Tıklaması</div>
          <div className={`text-xs mt-1 ${summary.phoneClicks.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.phoneClicks.change >= 0 ? '+' : ''}{summary.phoneClicks.change}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{summary.directionClicks}</div>
          <div className="text-sm text-gray-500">Yol Tarifi</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{summary.saves}</div>
          <div className="text-sm text-gray-500">Kaydedilme</div>
        </div>
      </div>

      <div className="p-6 grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Günlük Görüntülenme</h3>
          {renderBarChart(data.daily, 'views')}
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Cihaz Dağılımı</h3>
          {renderPieChart(data.devices)}
        </div>
      </div>

      {data.sources.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Trafik Kaynakları</h3>
            <div className="space-y-2">
              {data.sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{source.source || 'Diğer'}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500"
                        style={{ 
                          width: `${(parseInt(source.count as any) / data.sources.reduce((a, b) => a + parseInt(b.count as any), 0)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{source.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
