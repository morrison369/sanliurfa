import type { Migration } from '../lib/migrations';
import { SECTION_STYLES_BASE } from '../lib/site-content-presets';

const MVP_QUICK_START_STYLES = {
  mvpQuickStartSectionClass: 'relative z-10 -mt-8 px-4',
  mvpQuickStartContainerClass: 'container mx-auto',
  mvpQuickStartPanelClass:
    'rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 md:p-6',
  mvpQuickStartHeaderClass:
    'flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between',
  mvpQuickStartBadgeClass: 'text-xs font-bold uppercase tracking-[0.26em] text-red-600',
  mvpQuickStartTitleClass: 'mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl',
  mvpQuickStartDescriptionClass: 'mt-2 max-w-3xl text-sm text-slate-600 md:text-base',
  mvpQuickStartCtaClass:
    'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700',
  mvpQuickStartGridClass: 'mt-5 grid gap-4 lg:grid-cols-3',
  mvpQuickStartCardClass:
    'rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-xl',
  mvpQuickStartCardLinkClass: 'block',
  mvpQuickStartCardBadgeClass:
    'inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
  mvpQuickStartCardTitleClass: 'mt-4 text-xl font-extrabold text-slate-950',
  mvpQuickStartCardDescriptionClass: 'mt-2 text-sm leading-6 text-slate-600',
  mvpQuickStartLinksWrapClass: 'mt-5 flex flex-wrap gap-2',
  mvpQuickStartLinkClass:
    'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700',
};

export const migration_160_homepage_mvp_section_styles: Migration = {
  version: '160_homepage_mvp_section_styles',
  description: 'Ensure DB-managed style tokens for homepage MVP quick start section',

  up: async (pool: any) => {
    const value = {
      ...SECTION_STYLES_BASE,
      ...MVP_QUICK_START_STYLES,
    };

    await pool.query(
      `
        INSERT INTO site_settings (setting_key, setting_value, description)
        VALUES ('homepage.sectionStyles', $1::jsonb, 'Ana sayfa section class tokenları')
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = site_settings.setting_value || $2::jsonb,
          description = COALESCE(site_settings.description, EXCLUDED.description),
          updated_at = NOW();
      `,
      [JSON.stringify(value), JSON.stringify(MVP_QUICK_START_STYLES)],
    );
  },

  down: async (pool: any) => {
    await pool.query(`
      UPDATE site_settings
      SET setting_value = setting_value
        - 'mvpQuickStartSectionClass'
        - 'mvpQuickStartContainerClass'
        - 'mvpQuickStartPanelClass'
        - 'mvpQuickStartHeaderClass'
        - 'mvpQuickStartBadgeClass'
        - 'mvpQuickStartTitleClass'
        - 'mvpQuickStartDescriptionClass'
        - 'mvpQuickStartCtaClass'
        - 'mvpQuickStartGridClass'
        - 'mvpQuickStartCardClass'
        - 'mvpQuickStartCardLinkClass'
        - 'mvpQuickStartCardBadgeClass'
        - 'mvpQuickStartCardTitleClass'
        - 'mvpQuickStartCardDescriptionClass'
        - 'mvpQuickStartLinksWrapClass'
        - 'mvpQuickStartLinkClass',
        updated_at = NOW()
      WHERE setting_key = 'homepage.sectionStyles';
    `);
  },
};
