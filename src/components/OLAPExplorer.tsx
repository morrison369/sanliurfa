import React, { useState, useEffect } from 'react';

interface Dimension {
  name: string;
  label: string;
  levels: string[];
}

interface Measure {
  name: string;
  label: string;
  type: string;
}

export default function OLAPExplorer() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    loadDimensions();
  }, []);

  const loadDimensions = async () => {
    try {
      const response = await fetch('/api/warehouse/dimensions');
      if (!response.ok) throw new Error('Failed to load dimensions');
      const result = await response.json();
      setDimensions(result.data.dimensions);
      setMeasures(result.data.measures);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const executeQuery = async () => {
    if (selectedDimensions.length === 0 || selectedMeasures.length === 0) {
      setError('Select at least one dimension and one measure');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/warehouse/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cube: 'place_activity',
          dimensions: selectedDimensions,
          measures: selectedMeasures,
          limit: 100
        })
      });

      if (!response.ok) throw new Error('Query failed');
      const result = await response.json();
      setResults(result.data.rows || []);
      setCached(result.data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDimension = (dim: string) => {
    setSelectedDimensions(prev =>
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  };

  const toggleMeasure = (mes: string) => {
    setSelectedMeasures(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">OLAP Explorer</h1>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Dimensions</h3>
          <div className="space-y-2 p-4 border rounded bg-gray-50">
            {dimensions.map(dim => (
              <label key={dim.name} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDimensions.includes(dim.name)}
                  onChange={() => toggleDimension(dim.name)}
                  className="mr-2"
                />
                <span>{dim.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Measures</h3>
          <div className="space-y-2 p-4 border rounded bg-gray-50">
            {measures.map(mes => (
              <label key={mes.name} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMeasures.includes(mes.name)}
                  onChange={() => toggleMeasure(mes.name)}
                  className="mr-2"
                />
                <span>{mes.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={executeQuery}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Querying...' : 'Execute Query'}
        </button>
      </div>

      {cached && <div className="text-xs text-gray-600">✓ Result from cache</div>}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Results ({results.length} rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  {selectedDimensions.map(d => (
                    <th key={d} className="px-3 py-2 text-left font-semibold border-r">{d}</th>
                  ))}
                  {selectedMeasures.map(m => (
                    <th key={m} className="px-3 py-2 text-right font-semibold border-r">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    {selectedDimensions.map(d => (
                      <td key={d} className="px-3 py-2 border-r">{row[d] || '-'}</td>
                    ))}
                    {selectedMeasures.map(m => (
                      <td key={m} className="px-3 py-2 text-right border-r">{row[m] ? Math.round(row[m] * 100) / 100 : '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
