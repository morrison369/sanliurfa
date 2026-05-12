import { useState, useEffect } from 'react';
import {
 Shield,
 Database,
 AlertTriangle,
 CheckCircle,
 FileText,
 Lock,
 RefreshCw,
 Filter,
 Download
} from 'lucide-react';

interface AuditEntry {
 id: string;
 timestamp: string;
 entity: string;
 entityId: string;
 action: 'create' | 'update' | 'delete' | 'archive';
 actor: string;
 actorType: string;
}

interface ComplianceIssue {
 severity: 'error' | 'warning' | 'info';
 message: string;
}

interface GovernanceData {
 summary: {
 totalAuditEntries: number;
 entriesLast24h: number;
 entriesLast7d: number;
 sensitiveOperations: number;
 piiAccessEvents: number;
 };
 recentEntries: AuditEntry[];
 metrics: {
 byEntity: Array<{ entity: string; count: number }>;
 byAction: Array<{ action: string; count: number }>;
 byActorType: Array<{ type: string; count: number }>;
 };
 compliance: {
 score: number;
 status: 'good' | 'warning' | 'critical';
 issues: ComplianceIssue[];
 lastAudit: string;
 };
 dataRetention: {
 activePolicies: number;
 recordsScheduledForDeletion: number;
 nextPurgeDate: string;
 };
}

export default function GovernanceDashboard() {
 const [data, setData] = useState<GovernanceData | null>(null);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'compliance'>('overview');

 useEffect(() => {
 fetchGovernanceData();
 }, []);

 const fetchGovernanceData = async () => {
 try {
 const response = await fetch('/api/governance/dashboard');
 const result = await response.json();
 setData(result);
 } catch (error) {
 console.error('Failed to fetch governance data:', error);
 } finally {
 setLoading(false);
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'good': return 'text-green-600 bg-[rgba(34,197,94,0.12)]';
 case 'warning': return 'text-yellow-600 bg-[rgba(234,179,8,0.12)]';
 case 'critical': return 'text-red-600 bg-[rgba(239,68,68,0.1)]';
 default: return 'text-[#7A6B58] bg-[rgba(184,115,51,0.06)]';
 }
 };

 const getSeverityIcon = (severity: string) => {
 switch (severity) {
 case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
 case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
 case 'info': return <CheckCircle className="w-5 h-5 text-blue-500" />;
 default: return <CheckCircle className="w-5 h-5 text-[#7A6B58]" />;
 }
 };

 const getActionColor = (action: string) => {
 switch (action) {
 case 'create': return 'text-green-600 bg-[rgba(34,197,94,0.08)]';
 case 'update': return 'text-[#7A6B58] bg-[rgba(59,130,246,0.1)]';
 case 'delete': return 'text-red-600 bg-[rgba(239,68,68,0.1)]';
 case 'archive': return 'text-[#7A6B58] bg-[rgba(184,115,51,0.04)]';
 default: return 'text-[#7A6B58] bg-[rgba(184,115,51,0.04)]';
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <RefreshCw className="w-8 h-8 text-[#7A6B58] animate-spin" />
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-12">
 <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
 <p className="text-[#7A6B58]">Veri yüklenirken bir hata oluştu.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-[#1F1410]">Yönetişim Paneli</h2>
 <p className="text-[#7A6B58] mt-1">Veri yönetimi, denetim ve uyumluluk takibi</p>
 </div>
 <div className="flex items-center gap-3">
 <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.compliance.status)}`}>
 Uyumluluk Skoru: {data.compliance.score}%
 </span>
 <button 
 onClick={fetchGovernanceData}
 className="p-2 text-[#7A6B58] hover:text-[#1F1410] hover:bg-[rgba(184,115,51,0.06)] rounded-sm transition-colors"
 >
 <RefreshCw className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Tabs */}
 <div className="border-b border-[rgba(184,115,51,0.14)]">
 <div className="flex gap-8">
 {(['overview', 'audit', 'compliance'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
 activeTab === tab
 ? 'border-urfa-500 text-[#7A6B58]'
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410]'
 }`}
 >
 {tab === 'overview' && 'Genel Bakış'}
 {tab === 'audit' && 'Denetim Kayıtları'}
 {tab === 'compliance' && 'Uyumluluk'}
 </button>
 ))}
 </div>
 </div>

 {/* Overview Tab */}
 {activeTab === 'overview' && (
 <div className="space-y-6">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-[#7A6B58]">Toplam Kayıt</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.summary.totalAuditEntries.toLocaleString()}</p>
 </div>
 <div className="w-12 h-12 bg-[rgba(59,130,246,0.1)] rounded-sm flex items-center justify-center">
 <Database className="w-6 h-6 text-[#7A6B58]" />
 </div>
 </div>
 <p className="text-sm text-green-600 mt-2">+{data.summary.entriesLast24h} son 24 saat</p>
 </div>

 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-[#7A6B58]">Hassas Operasyon</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.summary.sensitiveOperations}</p>
 </div>
 <div className="w-12 h-12 bg-[rgba(234,179,8,0.08)] rounded-sm flex items-center justify-center">
 <Lock className="w-6 h-6 text-yellow-600" />
 </div>
 </div>
 <p className="text-sm text-[#7A6B58] mt-2">Son 7 gün</p>
 </div>

 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-[#7A6B58]">PII Erişimi</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.summary.piiAccessEvents}</p>
 </div>
 <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] rounded-sm flex items-center justify-center">
 <Shield className="w-6 h-6 text-red-600" />
 </div>
 </div>
 <p className="text-sm text-[#7A6B58] mt-2">Takip edilen olaylar</p>
 </div>

 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-[#7A6B58]">Aktif Politika</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.dataRetention.activePolicies}</p>
 </div>
 <div className="w-12 h-12 bg-[rgba(34,197,94,0.08)] rounded-sm flex items-center justify-center">
 <FileText className="w-6 h-6 text-green-600" />
 </div>
 </div>
 <p className="text-sm text-[#7A6B58] mt-2">Veri saklama</p>
 </div>
 </div>

 {/* Charts */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Entity Distribution */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <h3 className="font-semibold text-[#1F1410] mb-4">Varlık Dağılımı</h3>
 <div className="space-y-3">
 {data.metrics.byEntity.map((item) => (
 <div key={item.entity} className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58] capitalize">{item.entity}</span>
 <div className="flex items-center gap-2">
 <div className="w-24 h-2 bg-[rgba(184,115,51,0.06)] rounded-full overflow-hidden">
 <div 
 className="h-full bg-[#B87333] rounded-full"
 style={{ width: `${(item.count / data.summary.totalAuditEntries) * 100}%` }}
 />
 </div>
 <span className="text-sm font-medium text-[#1F1410]">{item.count.toLocaleString()}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Action Distribution */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <h3 className="font-semibold text-[#1F1410] mb-4">İşlem Türleri</h3>
 <div className="space-y-3">
 {data.metrics.byAction.map((item) => (
 <div key={item.action} className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58] capitalize">{item.action}</span>
 <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(item.action)}`}>
 {item.count.toLocaleString()}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Actor Type Distribution */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <h3 className="font-semibold text-[#1F1410] mb-4">Aktör Türleri</h3>
 <div className="space-y-3">
 {data.metrics.byActorType.map((item) => (
 <div key={item.type} className="flex items-center justify-between">
 <span className="text-sm text-[#7A6B58] capitalize">{item.type}</span>
 <span className="text-sm font-medium text-[#1F1410]">{item.count.toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Recent Entries */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm overflow-hidden">
 <div className="p-6 border-b border-[rgba(184,115,51,0.14)]">
 <h3 className="font-semibold text-[#1F1410]">Son Denetim Kayıtları</h3>
 </div>
 <div className="divide-y divide-[rgba(184,115,51,0.14)]">
 {data.recentEntries.map((entry) => (
 <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-[rgba(184,115,51,0.04)]">
 <div className="flex items-center gap-4">
 <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(entry.action)}`}>
 {entry.action}
 </span>
 <div>
 <p className="text-sm font-medium text-[#1F1410]">
 {entry.entity} - {entry.entityId}
 </p>
 <p className="text-xs text-[#7A6B58]">{entry.actor}</p>
 </div>
 </div>
 <span className="text-xs text-[#7A6B58]">
 {new Date(entry.timestamp).toLocaleString('tr-TR')}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Audit Tab */}
 {activeTab === 'audit' && (
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm overflow-hidden">
 <div className="p-4 border-b border-[rgba(184,115,51,0.14)] flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Filter className="w-5 h-5 text-[#4A3828]" />
 <select className="text-sm border-[rgba(184,115,51,0.25)] rounded-sm">
 <option value="">Tüm Varlıklar</option>
 <option value="users">Kullanıcılar</option>
 <option value="places">Mekanlar</option>
 <option value="reviews">Yorumlar</option>
 </select>
 <select className="text-sm border-[rgba(184,115,51,0.25)] rounded-sm">
 <option value="">Tüm İşlemler</option>
 <option value="create">Oluşturma</option>
 <option value="update">Güncelleme</option>
 <option value="delete">Silme</option>
 </select>
 </div>
 <button className="flex items-center gap-2 text-sm text-[#7A6B58] hover:text-[#1F1410]">
 <Download className="w-4 h-4" />
 Dışa Aktar
 </button>
 </div>
 <div className="divide-y divide-[rgba(184,115,51,0.14)]">
 {data.recentEntries.map((entry) => (
 <div key={entry.id} className="p-4 hover:bg-[rgba(184,115,51,0.04)]">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-3">
 <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(entry.action)}`}>
 {entry.action}
 </span>
 <div>
 <p className="text-sm font-medium text-[#1F1410]">
 {entry.entity} <span className="text-[#4A3828]">#{entry.entityId}</span>
 </p>
 <p className="text-xs text-[#7A6B58] mt-1">
 {entry.actor} ({entry.actorType})
 </p>
 </div>
 </div>
 <span className="text-xs text-[#4A3828]">
 {new Date(entry.timestamp).toLocaleString('tr-TR')}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Compliance Tab */}
 {activeTab === 'compliance' && (
 <div className="space-y-6">
 {/* Uyumluluk skoru */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="font-semibold text-[#1F1410]">Uyumluluk Durumu</h3>
 <p className="text-sm text-[#7A6B58] mt-1">
 Son denetim: {new Date(data.compliance.lastAudit).toLocaleDateString('tr-TR')}
 </p>
 </div>
 <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getStatusColor(data.compliance.status)}`}>
 <span className="text-2xl font-bold">{data.compliance.score}%</span>
 </div>
 </div>

 {/* Issues */}
 <div className="space-y-3">
 {data.compliance.issues.map((issue, index) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-[rgba(184,115,51,0.04)] rounded-sm">
 {getSeverityIcon(issue.severity)}
 <p className="text-sm text-[#7A6B58]">{issue.message}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Data Retention */}
 <div className="bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6">
 <h3 className="font-semibold text-[#1F1410] mb-4">Veri Saklama Politikası</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-4 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <p className="text-sm text-[#7A6B58]">Aktif Politikalar</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.dataRetention.activePolicies}</p>
 </div>
 <div className="p-4 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <p className="text-sm text-[#7A6B58]">Silinmeyi Bekleyen</p>
 <p className="text-2xl font-bold text-[#1F1410]">{data.dataRetention.recordsScheduledForDeletion}</p>
 </div>
 <div className="p-4 bg-[rgba(184,115,51,0.04)] rounded-sm">
 <p className="text-sm text-[#7A6B58]">Sonraki Temizlik</p>
 <p className="text-lg font-bold text-[#1F1410]">
 {new Date(data.dataRetention.nextPurgeDate).toLocaleDateString('tr-TR')}
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
