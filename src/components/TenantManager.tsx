/**
 * Tenant Manager Component
 * Multi-tenant administration and white-label configuration
 */

import React, { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subscription_tier: string;
  status: string;
  is_white_label: boolean;
  created_at: string;
}

interface TenantBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string;
  hide_branding: boolean;
}

export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    description: ''
  });

  // Load tenants
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Failed to load tenants');
      const result = await response.json();
      setTenants(result.data || []);
      if (result.data?.length > 0) {
        loadTenantDetails(result.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) throw new Error('Failed to load tenant details');
      const result = await response.json();
      setSelectedTenant(result.data.tenant);
      setBranding(result.data.branding);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading tenant details');
    }
  };

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant)
      });

      if (!response.ok) throw new Error('Failed to create tenant');
      const result = await response.json();
      setTenants([...tenants, result.data]);
      setNewTenant({ name: '', slug: '', description: '' });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating tenant');
    }
  };

  const updateBranding = async () => {
    if (!selectedTenant || !branding) return;

    try {
      const response = await fetch(`/api/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding })
      });

      if (!response.ok) throw new Error('Failed to update branding');
      // Show success message
      alert('Branding updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating branding');
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Kiracı Yönetimi</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Yeni Kiracı
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={createTenant} className="p-6 bg-white rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ad</label>
            <input
              type="text"
              required
              value={newTenant.name}
              onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              required
              value={newTenant.slug}
              onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea
              value={newTenant.description}
              onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500"
            ></textarea>
          </div>
          <div className="flex space-x-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Tenants List */}
        <div className="col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Kiracılar ({tenants.length})</h3>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => loadTenantDetails(tenant.id)}
                className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                  selectedTenant?.id === tenant.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <p className="font-medium text-gray-900">{tenant.name}</p>
                <p className="text-sm text-gray-500">{tenant.slug}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Details and Branding */}
        {selectedTenant && branding && (
          <div className="col-span-3 space-y-6">
            {/* Tenant Info */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Kiracı Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Ad</p>
                  <p className="font-medium text-gray-900">{selectedTenant.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Slug</p>
                  <p className="font-medium text-gray-900">{selectedTenant.slug}</p>
                </div>
                <div>
                  <p className="text-gray-600">Paket</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedTenant.subscription_tier}</p>
                </div>
                <div>
                  <p className="text-gray-600">Durum</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedTenant.status}</p>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Markalama</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ana Renk</label>
                  <div className="flex items-center space-x-3 mt-1">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">İkincil Renk</label>
                  <div className="flex items-center space-x-3 mt-1">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Vurgu Rengi</label>
                  <div className="flex items-center space-x-3 mt-1">
                    <input
                      type="color"
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    checked={branding.hide_branding}
                    onChange={(e) => setBranding({ ...branding, hide_branding: e.target.checked })}
                    className="w-4 h-4 border border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Orijinal Branding'i Gizle</span>
                </label>

                <button
                  onClick={updateBranding}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Markalamayı Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
