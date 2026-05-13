import { useState, useEffect} from 'react';
import TwoFactorManager from './TwoFactorManager';

interface UserProfile {
 id: string;
 email: string;
 full_name: string;
 username?: string;
 avatar_url?: string;
 bio?: string;
 points: number;
 level: number;
 language_preference: string;
 theme_preference: string;
 email_verified: boolean;
 notification_preferences: {
 email: boolean;
 push: boolean;
 in_app: boolean;
 digest: string;
 };
 privacy_settings: {
 profile_public: boolean;
 show_email: boolean;
 allow_messages: boolean;
 };
 two_factor_enabled: boolean;
}

export default function UserSettings() {
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'password' | 'privacy' | 'security'>('profile');
 const [isSaving, setIsSaving] = useState(false);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [isResendingVerification, setIsResendingVerification] = useState(false);

 // Profile form state
 const [profileForm, setProfileForm] = useState({
 full_name: '',
 username: '',
 avatar_url: '',
 bio: ''
 });

 // Settings form state
 // NOT: Dil tercihi KALDIRILDI - Site SADECE Türkçe destekler
 const [settingsForm, setSettingsForm] = useState({
 theme_preference: 'light'
 });

 // Password form state
 const [passwordForm, setPasswordForm] = useState({
 current_password: '',
 new_password: '',
 confirm_password: ''
 });


 // Privacy form state
 const [privacyForm, setPrivacyForm] = useState({
 profile_public: true,
 show_email: false,
 allow_messages: true
 });

 useEffect(() => {
 loadProfile();
 }, []);

 const loadProfile = async () => {
 try {
 setIsLoading(true);
 setError(null);
 const response = await fetch('/api/users/profile');

 if (!response.ok) {
 throw new Error('Profil yüklenemedi');
 }

 const data = await response.json();
 setProfile(data.data);
 setProfileForm({
 full_name: data.data.full_name,
 username: data.data.username || '',
 avatar_url: data.data.avatar_url || '',
 bio: data.data.bio || ''
 });
 setSettingsForm({
 theme_preference: data.data.theme_preference
 });
 setPrivacyForm(data.data.privacy_settings);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsLoading(false);
 }
 };

 const handleSaveProfile = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 setIsSaving(true);
 setError(null);

 try {
 const response = await fetch('/api/users/profile', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(profileForm)
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Profil güncellenemedi');
 }

 setSuccessMessage('Profil başarıyla güncellendi');
 setTimeout(() => setSuccessMessage(null), 3000);
 await loadProfile();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsSaving(false);
 }
 };

 const handleSaveSettings = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 setIsSaving(true);
 setError(null);

 try {
 const response = await fetch('/api/users/settings', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 // Dil tercihi gönderilmiyor - sadece tema
 body: JSON.stringify({ theme_preference: settingsForm.theme_preference })
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Ayarlar güncellenemedi');
 }

 setSuccessMessage('Ayarlar başarıyla güncellendi');
 setTimeout(() => setSuccessMessage(null), 3000);
 await loadProfile();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsSaving(false);
 }
 };

 const handleChangePassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 setIsSaving(true);
 setError(null);

 try {
 const response = await fetch('/api/users/password', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(passwordForm)
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Şifre değiştirilirken hata oluştu');
 }

 setSuccessMessage('Şifre başarıyla değiştirildi');
 setPasswordForm({
 current_password: '',
 new_password: '',
 confirm_password: ''
 });
 setTimeout(() => setSuccessMessage(null), 3000);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsSaving(false);
 }
 };

 const handleSavePrivacy = async (e: React.SyntheticEvent<HTMLFormElement>) => {
 e.preventDefault();
 setIsSaving(true);
 setError(null);

 try {
 const response = await fetch('/api/users/privacy', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(privacyForm)
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Gizlilik ayarları güncellenemedi');
 }

 setSuccessMessage('Gizlilik ayarları başarıyla güncellendi');
 setTimeout(() => setSuccessMessage(null), 3000);
 await loadProfile();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsSaving(false);
 }
 };

 const handleResendVerification = async () => {
 setIsResendingVerification(true);
 setError(null);

 try {
 const response = await fetch('/api/users/resend-verification', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' }
 });

 if (!response.ok) {
 const data = await response.json();
 throw new Error(data.error || 'Doğrulama e-postası gönderilemedi');
 }

 setSuccessMessage('Doğrulama e-postası başarıyla gönderildi');
 setTimeout(() => setSuccessMessage(null), 3000);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bir hata oluştu');
 } finally {
 setIsResendingVerification(false);
 }
 };

 if (isLoading) {
 return (
 <div className="text-center py-8">
 <p className="text-[#7A6B58]">Yükleniyor…</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Tab Navigation */}
 <div className="flex border-b border-[rgba(184,115,51,0.14)] mb-6">
 <button
 onClick={() => setActiveTab('profile')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 activeTab === 'profile'
 ? 'border-urfa-500 text-[#7A6B58] '
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410] '
 }`}
 >
 Profil
 </button>
 <button
 onClick={() => setActiveTab('settings')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 activeTab === 'settings'
 ? 'border-urfa-500 text-[#7A6B58] '
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410] '
 }`}
 >
 Genel Ayarlar
 </button>
 <button
 onClick={() => setActiveTab('privacy')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 activeTab === 'privacy'
 ? 'border-urfa-500 text-[#7A6B58] '
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410] '
 }`}
 >
 Gizlilik
 </button>
 <button
 onClick={() => setActiveTab('password')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 activeTab === 'password'
 ? 'border-urfa-500 text-[#7A6B58] '
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410] '
 }`}
 >
 Şifre
 </button>
 <button
 onClick={() => setActiveTab('security')}
 className={`px-4 py-2 font-medium border-b-2 transition-colors ${
 activeTab === 'security'
 ? 'border-urfa-500 text-[#7A6B58] '
 : 'border-transparent text-[#7A6B58] hover:text-[#1F1410] '
 }`}
 >
 Güvenlik
 </button>
 </div>

 {/* Messages */}
 {error && (
 <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-400 text-sm">
 {error}
 </div>
 )}

 {successMessage && (
 <div className="p-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-sm text-green-600 text-sm">
 {successMessage}
 </div>
 )}

 {/* Email Verification Status */}
 {profile && !profile.email_verified && (
 <div className="bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4">
 <div className="flex items-start justify-between gap-4">
 <div>
 <h3 className="font-semibold text-yellow-400 mb-1">E-posta Doğrulanmadı</h3>
 <p className="text-sm text-yellow-400 ">
 Hesabınızın güvenliği için e-posta adresinizi doğrulayın: {profile.email}
 </p>
 </div>
 <button
 onClick={handleResendVerification}
 disabled={isResendingVerification}
 className="flex-shrink-0 px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
 >
 {isResendingVerification ? 'Gönderiliyor...' : 'Doğrula'}
 </button>
 </div>
 </div>
 )}

 {/* Profile Tab */}
 {activeTab === 'profile' && (
 <form onSubmit={handleSaveProfile} className="bg-[var(--bg-card)] rounded-sm p-6 space-y-4">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-4">Profil Bilgileriniz</h2>

 <div className="bg-[rgba(184,115,51,0.04)] rounded-sm p-4 mb-4">
 <div className="flex items-center justify-between gap-2">
 <div>
 <p className="text-sm text-[#7A6B58]">E-posta Adresi</p>
 <p className="font-medium text-[#1F1410]">{profile?.email}</p>
 </div>
 <div className="flex items-center gap-2">
 {profile?.email_verified ? (
 <>
 <span className="text-green-600 ">✓</span>
 <span className="text-sm text-green-600 ">Doğrulanmış</span>
 </>
 ) : (
 <>
 <span className="text-yellow-600 ">!</span>
 <span className="text-sm text-yellow-600 ">Doğrulanmadı</span>
 </>
 )}
 </div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Ad Soyad
 </label>
 <input
 type="text"
 value={profileForm.full_name}
 onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Kullanıcı Adı
 </label>
 <input
 type="text"
 value={profileForm.username}
 onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
 placeholder="Boş bırakabilirsiniz"
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Avatar URL
 </label>
 <input
 type="url"
 value={profileForm.avatar_url}
 onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
 placeholder="https://..."
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Biyografi
 </label>
 <textarea
 value={profileForm.bio}
 onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
 placeholder="Kendiniz hakkında biraz yazın..."
 rows={4}
 maxLength={500}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)] resize-none"
 />
 <p className="text-xs text-[#7A6B58] mt-1">
 {profileForm.bio.length}/500
 </p>
 </div>

 <button
 type="submit"
 disabled={isSaving}
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isSaving ? 'Kaydediliyor...' : 'Profili Kaydet'}
 </button>
 </form>
 )}

 {/* Settings Tab */}
 {activeTab === 'settings' && (
 <form onSubmit={handleSaveSettings} className="bg-[var(--bg-card)] rounded-sm p-6 space-y-4">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-4">Genel Ayarlar</h2>

 {/* Dil Bilgilendirmesi - Seçici kaldırıldı */}
 <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-sm p-4">
 <div className="flex items-center gap-3">
 <span className="text-xl">🇹🇷</span>
 <div>
 <p className="font-medium text-blue-300 ">Türkçe</p>
 <p className="text-sm text-blue-300 ">
 Site sadece Türkçe olarak kullanılabilir. Diğer dil seçenekleri mevcut değildir.
 </p>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Tema
 </label>
 <select
 value={settingsForm.theme_preference}
 onChange={(e) => setSettingsForm({ ...settingsForm, theme_preference: e.target.value })}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 >
 <option value="light">Açık</option>
 <option value="dark">Koyu</option>
 <option value="auto">Otomatik</option>
 </select>
 </div>

 <button
 type="submit"
 disabled={isSaving}
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
 </button>
 </form>
 )}

 {/* Privacy Tab */}
 {activeTab === 'privacy' && (
 <form onSubmit={handleSavePrivacy} className="bg-[var(--bg-card)] rounded-sm p-6 space-y-4">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-4">Gizlilik Ayarları</h2>

 <div className="space-y-3">
 <label className="flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={privacyForm.profile_public}
 onChange={(e) => setPrivacyForm({ ...privacyForm, profile_public: e.target.checked })}
 className="w-4 h-4 text-[#7A6B58] rounded focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <span className="ml-3 text-[#7A6B58]">Profilimi herkese görünür yap</span>
 </label>

 <label className="flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={privacyForm.show_email}
 onChange={(e) => setPrivacyForm({ ...privacyForm, show_email: e.target.checked })}
 className="w-4 h-4 text-[#7A6B58] rounded focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <span className="ml-3 text-[#7A6B58]">E-posta adresimi göster</span>
 </label>

 <label className="flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={privacyForm.allow_messages}
 onChange={(e) => setPrivacyForm({ ...privacyForm, allow_messages: e.target.checked })}
 className="w-4 h-4 text-[#7A6B58] rounded focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <span className="ml-3 text-[#7A6B58]">Bana direkt mesaj gönderilebilsin</span>
 </label>
 </div>

 <button
 type="submit"
 disabled={isSaving}
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isSaving ? 'Kaydediliyor...' : 'Gizlilik Ayarlarını Kaydet'}
 </button>
 </form>
 )}

 {/* Password Tab */}
 {activeTab === 'password' && (
 <form onSubmit={handleChangePassword} className="bg-[var(--bg-card)] rounded-sm p-6 space-y-4">
 <h2 className="text-lg font-semibold text-[#1F1410] mb-4">Şifre Değiştir</h2>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Mevcut Şifre
 </label>
 <input
 type="password"
 autoComplete="current-password"
 value={passwordForm.current_password}
 onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Yeni Şifre
 </label>
 <input
 type="password"
 autoComplete="new-password"
 value={passwordForm.new_password}
 onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 <p className="text-xs text-[#7A6B58] mt-1">
 En az 8 karakter, bir büyük harf, sayı ve özel karakter içermelidir
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-[#7A6B58] mb-2">
 Şifreyi Onayla
 </label>
 <input
 type="password"
 autoComplete="new-password"
 value={passwordForm.confirm_password}
 onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
 className="w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#1F1410] focus:outline-none focus:ring-2 focus:ring-[rgba(184,115,51,0.5)]"
 />
 </div>

 <button
 type="submit"
 disabled={isSaving}
 className="w-full px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isSaving ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
 </button>
 </form>
 )}

 {/* Security Tab */}
 {activeTab === 'security' && (
 <div className="space-y-6">
 <TwoFactorManager onStatusChange={() => loadProfile()} />
 </div>
 )}
 </div>
 );
}
