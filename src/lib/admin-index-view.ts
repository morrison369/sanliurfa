import type { AdminIndexRiskCard, AdminIndexToolCard } from './admin-index';
import {
  formatAdminIndexGeneratedAt,
  getAdminIndexRiskCardClass,
  getAdminIndexStatusBadgeClass,
} from './admin-index-page';

export type AdminIndexRiskCardView = {
  href: string;
  title: string;
  status: AdminIndexRiskCard['status'];
  summary: string;
  detail: string;
  actionText: string;
  generatedAtLabel: string;
  badgeClassName: string;
  cardClassName: string;
  icon: AdminIndexRiskCard['icon'];
};

export type AdminIndexToolCardView = AdminIndexToolCard & {
  icon: AdminIndexToolCard['icon'];
};

export function buildAdminIndexRiskCardViews(cards: AdminIndexRiskCard[]): AdminIndexRiskCardView[] {
  return cards.map((card) => ({
    href: card.href,
    title: card.title,
    status: card.status,
    summary: card.summary,
    detail: card.detail,
    actionText: card.action[card.status],
    generatedAtLabel: formatAdminIndexGeneratedAt(card.generatedAt),
    badgeClassName: getAdminIndexStatusBadgeClass(card.status),
    cardClassName: getAdminIndexRiskCardClass(card.status),
    icon: card.icon,
  }));
}

export function buildAdminIndexToolCardViews(cards: AdminIndexToolCard[]): AdminIndexToolCardView[] {
  return cards.map((card) => ({ ...card }));
}
