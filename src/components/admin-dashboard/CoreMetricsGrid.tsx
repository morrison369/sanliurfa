import React from 'react';
import { AlertCircle, FileText, Flag, KeyRound, ShieldAlert, Users } from 'lucide-react';
import type { AdminStatusLevel } from '../../lib/admin-status';
import type { AdminDashboardOverviewData } from '../../types/admin-api';
import { cardClassName, statusTone } from './utils';

type Props = {
  data: AdminDashboardOverviewData;
  integrationLevel: AdminStatusLevel;
  releaseGateLevel: AdminStatusLevel;
  nightlyRegressionLevel: AdminStatusLevel;
  nightlyE2eLevel: AdminStatusLevel;
};

export function CoreMetricsGrid({
  data,
  integrationLevel,
  releaseGateLevel,
  nightlyRegressionLevel,
  nightlyE2eLevel,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-slate-700" />
          <h3 className="font-medium text-gray-700">Ops Durumu</h3>
        </div>
        <div className="space-y-1">
          <div className={`text-2xl font-bold ${statusTone(data.statusSummary?.overall || 'blocked')}`}>
            {data.statusSummary?.overall || 'blocked'}
          </div>
          <div className="text-xs text-gray-500">
            Release: {releaseGateLevel} • Reg: {nightlyRegressionLevel} • E2E: {nightlyE2eLevel}
          </div>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-700">Kullanıcılar</h3>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{data.overview.users.total}</div>
          <div className="text-xs text-gray-500">
            +{data.overview.users.new} yeni • {data.overview.users.active} aktif
          </div>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-5 h-5 text-green-600" />
          <h3 className="font-medium text-gray-700">İçerik</h3>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{data.overview.content.places}</div>
          <div className="text-xs text-gray-500">
            {data.overview.content.reviews} inceleme • +{data.overview.content.newReviews}
          </div>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <Flag className="w-5 h-5 text-orange-600" />
          <h3 className="font-medium text-gray-700">Bayraklar</h3>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-orange-600">{data.overview.flags.pending}</div>
          <div className="text-xs text-gray-500">
            Beklemede • {data.overview.flags.resolved} çözüldü
          </div>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h3 className="font-medium text-gray-700">Moderasyon</h3>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-red-600">{data.overview.moderation.totalActions}</div>
          <div className="text-xs text-gray-500">
            {data.overview.moderation.warnings} uyarı • {data.overview.moderation.bans} ban
          </div>
        </div>
      </div>

      <div className={cardClassName()}>
        <div className="flex items-center gap-3 mb-3">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-700">Entegrasyonlar</h3>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-indigo-600">
            {data.integrations?.summary?.configuredCount ??
              (Number(data.integrations?.resend?.configured) + Number(data.integrations?.analytics?.configured))}
            /{data.integrations?.summary?.total || 2}
          </div>
          <div className="text-xs text-gray-500">
            RESEND: {data.integrations?.resend?.source || 'none'} • Analytics: {data.integrations?.analytics?.source || 'none'}
          </div>
          <div className="text-xs text-gray-500">
            Durum: <span className={statusTone(integrationLevel)}>{integrationLevel}</span>
          </div>
          <div className="text-xs text-gray-500">
            Doğrulama: {data.integrations?.verification?.summary?.healthy ? 'verified' : 'review'}
          </div>
        </div>
      </div>
    </div>
  );
}

