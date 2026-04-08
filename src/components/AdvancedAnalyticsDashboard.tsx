/**
 * Advanced Analytics Dashboard Component
 * Cohorts, funnels, journeys, predictions
 */

import { useState, useEffect } from 'react';

export function AdvancedAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'cohorts' | 'funnels' | 'predictions' | 'journeys'>('cohorts');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (activeTab) {
        case 'cohorts':
          url = '/api/analytics/cohorts';
          break;
        case 'funnels':
          url = '/api/analytics/funnels';
          break;
        case 'predictions':
          url = '/api/analytics/predictions?type=churn';
          break;
        case 'journeys':
          url = '/api/analytics/journeys?type=top_paths&limit=10';
          break;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('cohorts')}
          className={`px-4 py-2 ${activeTab === 'cohorts' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Kullanıcı Kohortları
        </button>
        <button
          onClick={() => setActiveTab('funnels')}
          className={`px-4 py-2 ${activeTab === 'funnels' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Dönüşüm Funnelleri
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-2 ${activeTab === 'predictions' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Tahminler
        </button>
        <button
          onClick={() => setActiveTab('journeys')}
          className={`px-4 py-2 ${activeTab === 'journeys' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-600'}`}
        >
          Kullanıcı Yolculukları
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : (
        <div className="grid gap-4">
          {activeTab === 'cohorts' && Array.isArray(data) && data.map((cohort: any) => (
            <div key={cohort.id} className="bg-white border rounded-lg p-4">
              <h3 className="font-bold">{cohort.cohort_name}</h3>
              <p className="text-sm text-gray-600">{cohort.cohort_type}</p>
              <p className="text-sm font-medium mt-2">{cohort.member_count} üye</p>
            </div>
          ))}

          {activeTab === 'funnels' && Array.isArray(data) && data.map((funnel: any) => (
            <div key={funnel.id} className="bg-white border rounded-lg p-4">
              <h3 className="font-bold">{funnel.funnel_name}</h3>
              <p className="text-sm text-gray-600">{funnel.goal_description}</p>
              <p className="text-sm font-medium mt-2">{funnel.funnel_steps?.length || 0} adım</p>
            </div>
          ))}

          {activeTab === 'predictions' && Array.isArray(data) && data.map((pred: any) => (
            <div key={pred.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Kullanıcı</p>
                  <p className="font-medium">{pred.user_id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  pred.churn_risk_level === 'high' ? 'bg-red-100 text-red-700' :
                  pred.churn_risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {pred.churn_risk_level?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm mt-2">Churn Riski: {(pred.churn_probability * 100).toFixed(1)}%</p>
            </div>
          ))}

          {activeTab === 'journeys' && Array.isArray(data) && data.map((path: any) => (
            <div key={path.id} className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-sm">Yol Uzunluğu: {path.path_length} adım</h3>
              <p className="text-sm text-gray-600 mt-1">{path.user_count} kullanıcı</p>
              <p className="text-sm font-medium mt-1">Dönüşüm Oranı: {path.conversion_rate?.toFixed(1) || 0}%</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
