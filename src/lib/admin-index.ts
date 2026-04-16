import type { Icon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
  FileText,
  Gauge,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Store,
  Users,
} from 'lucide-react';
import type { AdminAccessCoverage } from './admin-access-coverage';
import type { ArtifactHealthSummary, AdminArtifactHealthSnapshot } from './artifact-health';
import type { AdminStatusLevel } from './admin-status';
import type { NightlyOpsSummary } from './nightly-ops-summary';
import type { ReleaseGateSummary } from './release-gate-summary';

export type AdminIndexRiskCard = {
  href: string;
  title: string;
  status: AdminStatusLevel;
  summary: string;
  detail: string;
  action: Record<AdminStatusLevel, string>;
  generatedAt: string | null;
  icon: Icon;
};

export type AdminIndexToolCard = {
  href: string;
  title: string;
  description: string;
  meta: string;
  icon: Icon;
};

export function getStatusPriority(status: AdminStatusLevel): number {
  return status === 'blocked' ? 0 : status === 'degraded' ? 1 : 2;
}

export function getLatestArtifactGeneratedAt(snapshot: AdminArtifactHealthSnapshot): string | null {
  return (
    Object.values(snapshot)
      .map((entry) => entry.generatedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

export function getFirstProblematicArtifact(snapshot: AdminArtifactHealthSnapshot): string {
  const entries = [
    { label: 'Release Gate', ...snapshot.releaseGate },
    { label: 'Nightly Regression', ...snapshot.nightlyRegression },
    { label: 'Nightly E2E', ...snapshot.nightlyE2E },
    { label: 'Performance Ops', ...snapshot.performanceOps },
    { label: 'Access Coverage', ...snapshot.adminAccessCoverage },
  ];

  return entries.find((entry) => entry.status !== 'healthy')?.label ?? 'Sorun yok';
}

export function buildAdminIndexRiskCards(options: {
  releaseGate: ReleaseGateSummary;
  releaseGateStatus: AdminStatusLevel;
  nightlyRegression: NightlyOpsSummary;
  nightlyRegressionStatus: AdminStatusLevel;
  adminAccessCoverage: AdminAccessCoverage;
  accessCoverageStatus: AdminStatusLevel;
  artifactHealthSummary: ArtifactHealthSummary;
  artifactHealth: AdminArtifactHealthSnapshot;
}): AdminIndexRiskCard[] {
  const firstProblematicArtifact = getFirstProblematicArtifact(options.artifactHealth);
  const latestArtifactGeneratedAt = getLatestArtifactGeneratedAt(options.artifactHealth);

  return [
    {
      href: '/admin/dashboard',
      title: 'Release Gate',
      status: options.releaseGateStatus,
      summary: `${options.releaseGate.finalStatus} • Hata ${options.releaseGate.failedStepCount}`,
      detail:
        options.releaseGate.blockingFailedSteps[0] ||
        options.releaseGate.advisoryFailedSteps[0] ||
        'Blocking hata yok',
      action: {
        healthy: 'Aksiyon: rutin izleme yeterli',
        degraded: 'Aksiyon: failing step detayını aç',
        blocked: 'Aksiyon: release gate blocker adımını hemen aç',
      },
      generatedAt: options.releaseGate.generatedAt,
      icon: ShieldAlert,
    },
    {
      href: '/admin/dashboard',
      title: 'Nightly',
      status: options.nightlyRegressionStatus,
      summary: `Regression ${options.nightlyRegression.outcome} • %${options.nightlyRegression.successRatePercent ?? 'yok'}`,
      detail: options.nightlyRegression.topFailures[0] || 'Öne çıkan failure yok',
      action: {
        healthy: 'Aksiyon: trend izleme yeterli',
        degraded: 'Aksiyon: top failure ve success rate kontrol et',
        blocked: 'Aksiyon: nightly pipeline çıktısını hemen incele',
      },
      generatedAt: options.nightlyRegression.generatedAt,
      icon: Activity,
    },
    {
      href: '/admin/access-coverage',
      title: 'Access Coverage',
      status: options.accessCoverageStatus,
      summary: `%${options.adminAccessCoverage.coveragePercent} • Drift ${options.adminAccessCoverage.driftCount}`,
      detail: options.adminAccessCoverage.driftedFiles[0] || 'Drift yok',
      action: {
        healthy: 'Aksiyon: wrapper parity korundu, izleme yeterli',
        degraded: 'Aksiyon: drift dosyasını aç ve wrapper parity düzelt',
        blocked: 'Aksiyon: wrapper coverage kırığını hemen kapat',
      },
      generatedAt: options.adminAccessCoverage.generatedAt,
      icon: Gauge,
    },
    {
      href: '/admin/dashboard',
      title: 'Artifact Health',
      status: options.artifactHealthSummary.overall,
      summary: `Healthy ${options.artifactHealthSummary.healthyCount} • Degraded ${options.artifactHealthSummary.degradedCount} • Blocked ${options.artifactHealthSummary.blockedCount}`,
      detail: `İlk risk: ${firstProblematicArtifact}`,
      action: {
        healthy: 'Aksiyon: artifact freshness stabil',
        degraded: 'Aksiyon: problemli artifact kaynağını dashboarddan doğrula',
        blocked: 'Aksiyon: eksik veya bayat artifact kaynağını hemen doğrula',
      },
      generatedAt: latestArtifactGeneratedAt,
      icon: ShieldCheck,
    },
  ].sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status));
}

export function buildAdminIndexToolCards(stats: {
  pending: number;
  messages: number;
}): AdminIndexToolCard[] {
  return [
    {
      href: '/admin/runtime-monitor',
      title: 'Runtime Monitör',
      description: 'Health, performance ve artifact sinyalleri',
      meta: 'Öncelik: Kritik izleme',
      icon: Activity,
    },
    {
      href: '/admin/integrations',
      title: 'Entegrasyon Ayarları',
      description: 'RESEND ve Analytics anahtarları',
      meta: 'Öncelik: Konfigürasyon',
      icon: Settings,
    },
    {
      href: '/admin/users',
      title: 'Kullanıcılar',
      description: 'Kullanıcı yönetimi',
      meta: 'Öncelik: Yönetim',
      icon: Users,
    },
    {
      href: '/admin/audit',
      title: 'Admin Audit',
      description: 'Kalıcı admin ops audit kayıtları',
      meta: 'Öncelik: İnceleme',
      icon: ShieldEllipsis,
    },
    {
      href: '/admin/places',
      title: 'Mekanlar',
      description: `${stats.pending} onay bekleyen`,
      meta: 'Öncelik: İçerik bakımı',
      icon: Store,
    },
    {
      href: '/admin/messages',
      title: 'Mesajlar',
      description: `${stats.messages} yeni mesaj`,
      meta: 'Öncelik: Gelen kutusu',
      icon: MessageSquare,
    },
    {
      href: '/admin/reviews',
      title: 'Yorumlar',
      description: 'Yorum moderasyonu',
      meta: 'Öncelik: Moderasyon',
      icon: FileText,
    },
    {
      href: '/admin/blog',
      title: 'Blog',
      description: 'Blog yazıları',
      meta: 'Öncelik: İçerik yayını',
      icon: FileText,
    },
    {
      href: '/admin/events',
      title: 'Etkinlikler',
      description: 'Etkinlik yönetimi',
      meta: 'Öncelik: Takvim akışı',
      icon: CalendarDays,
    },
  ];
}
