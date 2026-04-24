/**
 * Analitik panel bileşeni
 * KPI ve metrikleri gösterir.
 */
import { useState } from 'react';

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-gray-200">
        <button onClick={() => setTab("overview")} className="px-4 py-2 font-medium border-b-2">Genel Bakış</button>
        <button onClick={() => setTab("kpis")} className="px-4 py-2 font-medium border-b-2">KPI'lar</button>
        <button onClick={() => setTab("dashboards")} className="px-4 py-2 font-medium border-b-2">Paneller</button>
      </div>
      {tab === "overview" && <div><h3>İşletme Metrikleri</h3></div>}
      {tab === "kpis" && <div><h3>KPI Yönetimi</h3></div>}
      {tab === "dashboards" && <div><h3>Paneller</h3></div>}
    </div>
  );
}
