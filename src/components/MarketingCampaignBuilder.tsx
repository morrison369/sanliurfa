import { useState, useEffect} from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Trash2, Play, Pause, Plus, Save } from 'lucide-react';

interface Campaign {
 id: string;
 place_id: string;
 name: string;
 campaign_type: string;
 status: string;
 budget: number;
 spent: number;
 start_date?: string;
 end_date?: string;
 created_at: string;
}

interface MarketingCampaignBuilderProps {
 placeId?: string;
 onCampaignCreated?: () => void;
}

export default function MarketingCampaignBuilder({ placeId, onCampaignCreated }: MarketingCampaignBuilderProps) {
 const [campaigns, setCampaigns] = useState<Campaign[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [formData, setFormData] = useState({
 place_id: placeId || '',
 name: '',
 description: '',
 campaign_type: 'promotion',
 budget: 0,
 targeting: {},
 creative_content: {}
 });

 useEffect(() => {
 fetchCampaigns();
 }, []);

 const fetchCampaigns = async () => {
 try {
 setLoading(true);
 const response = await fetch('/api/marketing-campaigns');
 const json = await response.json();
 if (json.success) {
 setCampaigns(json.data);
 }
 } catch (error) {
 console.error('Failed to fetch campaigns:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 try {
 const response = await fetch('/api/marketing-campaigns', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData)
 });

 const json = await response.json();
 if (json.success) {
 setShowForm(false);
 setFormData({
 place_id: placeId || '',
 name: '',
 description: '',
 campaign_type: 'promotion',
 budget: 0,
 targeting: {},
 creative_content: {}
 });
 fetchCampaigns();
 onCampaignCreated?.();
 }
 } catch (error) {
 console.error('Failed to create campaign:', error);
 }
 };

 const handleStatusChange = async (id: string, action: 'publish' | 'pause') => {
 try {
 const response = await fetch(`/api/marketing-campaigns/${id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action })
 });

 const json = await response.json();
 if (json.success) {
 fetchCampaigns();
 }
 } catch (error) {
 console.error('Failed to update campaign:', error);
 }
 };

 const handleDelete = async (id: string) => {
 if (!await (window as any).showConfirm?.('Kampanyayı silmek istediğinizden emin misiniz?')) return;

 try {
 const response = await fetch(`/api/marketing-campaigns/${id}`, {
 method: 'DELETE'
 });

 const json = await response.json();
 if (json.success) {
 fetchCampaigns();
 }
 } catch (error) {
 console.error('Failed to delete campaign:', error);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center p-8">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-urfa-500"></div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-2xl font-bold text-[#1F1410]">Pazarlama Kampanyaları</h2>
 <button
 onClick={() => setShowForm(!showForm)}
 className="inline-flex items-center gap-2 px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 transition-colors"
 >
 <Plus size={20} />
 Yeni Kampanya
 </button>
 </div>

 {showForm && (
 <div className="bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6">
 <h3 className="text-lg font-semibold mb-4">Yeni Kampanya Oluştur</h3>
 <form onSubmit={handleCreate} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <input
 type="text"
 placeholder="Kampanya Adı"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 required
 />
 <select
 value={formData.campaign_type}
 onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
 className="px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 >
 <option value="promotion">Promosyon</option>
 <option value="awareness">Farkındalık</option>
 <option value="conversion">Dönüşüm</option>
 <option value="retention">Müşteri Tutma</option>
 </select>
 </div>

 <textarea
 placeholder="Kampanya Açıklaması"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 rows={3}
 />

 <input
 type="number"
 placeholder="Bütçe"
 value={formData.budget}
 onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410]"
 step="0.01"
 min="0"
 required
 />

 <div className="flex gap-2">
 <button
 type="submit"
 className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors flex items-center gap-2"
 >
 <Save size={18} />
 Oluştur
 </button>
 <button
 type="button"
 onClick={() => setShowForm(false)}
 className="px-4 py-2 bg-[rgba(184,115,51,0.12)] text-[#1F1410] rounded-sm hover:bg-[rgba(184,115,51,0.2)] transition-colors"
 >
 İptal Et
 </button>
 </div>
 </form>
 </div>
 )}

 <div className="grid gap-4">
 {campaigns.length === 0 ? (
 <div className="text-center py-8 text-[#7A6B58]">
 Henüz kampanya yok. Yeni bir kampanya oluşturmak için yukarıdaki butona tıklayın.
 </div>
 ) : (
 campaigns.map((campaign) => (
 <div
 key={campaign.id}
 className="bg-[var(--bg-card)] rounded-sm shadow p-4"
 >
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-[#1F1410]">{campaign.name}</h3>
 <div className="mt-2 flex items-center gap-4 text-sm text-[#7A6B58]">
 <span className="px-2 py-1 bg-[rgba(184,115,51,0.06)] rounded capitalize">
 {campaign.campaign_type === 'promotion'
 ? 'Promosyon'
 : campaign.campaign_type === 'awareness'
 ? 'Farkındalık'
 : campaign.campaign_type === 'conversion'
 ? 'Dönüşüm'
 : 'Müşteri Tutma'}
 </span>
 <span
 className={`px-2 py-1 rounded capitalize ${
 campaign.status === 'published'
 ? 'bg-[rgba(34,197,94,0.12)] text-green-400 '
 : campaign.status === 'paused'
 ? 'bg-[rgba(234,179,8,0.12)] text-yellow-400 '
 : 'bg-[rgba(59,130,246,0.1)] text-blue-300 '
 }`}
 >
 {campaign.status === 'published'
 ? 'Yayında'
 : campaign.status === 'paused'
 ? 'Duraklatıldı'
 : 'Taslak'}
 </span>
 </div>

 <div className="mt-3 flex items-center gap-6 text-sm">
 <div>
 <span className="text-[#7A6B58]">Bütçe: </span>
 <span className="font-semibold">₺{campaign.budget.toFixed(2)}</span>
 </div>
 <div>
 <span className="text-[#7A6B58]">Harcanan: </span>
 <span className="font-semibold">₺{campaign.spent.toFixed(2)}</span>
 </div>
 <div>
 <span className="text-[#7A6B58]">Oluşturma: </span>
 <span>{format(new Date(campaign.created_at), 'd MMM yyyy', { locale: tr })}</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {campaign.status === 'draft' && (
 <button
 onClick={() => handleStatusChange(campaign.id, 'publish')}
 className="p-2 text-green-600 hover:bg-[rgba(34,197,94,0.08)] rounded-sm transition-colors"
 title="Yayınla"
 >
 <Play size={20} />
 </button>
 )}
 {campaign.status === 'published' && (
 <button
 onClick={() => handleStatusChange(campaign.id, 'pause')}
 className="p-2 text-yellow-600 hover:bg-[rgba(234,179,8,0.08)] rounded-sm transition-colors"
 title="Duraklat"
 >
 <Pause size={20} />
 </button>
 )}
 {(campaign.status === 'draft' || campaign.status === 'paused') && (
 <button
 onClick={() => handleDelete(campaign.id)}
 className="p-2 text-red-600 hover:bg-[rgba(239,68,68,0.1)] rounded-sm transition-colors"
 title="Sil"
 >
 <Trash2 size={20} />
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
