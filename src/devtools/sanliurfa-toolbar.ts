import { defineToolbarApp } from 'astro/toolbar';

const QUICK_LINKS = [
  { label: 'Admin', href: '/admin' },
  { label: 'Analitik', href: '/admin/analytics' },
  { label: 'Moderasyon', href: '/admin/moderation' },
  { label: 'Sitemap', href: '/sitemap.xml' },
  { label: 'Health', href: '/api/health' },
];

const STATS = [
  { label: 'Framework', value: 'Astro 6.1 SSR' },
  { label: 'Adapter', value: '@astrojs/node standalone' },
  { label: 'UI', value: 'React 19 Islands' },
  { label: 'DB', value: 'PostgreSQL (pg)' },
  { label: 'Cache', value: 'Redis • sanliurfa: ns' },
  { label: 'Auth', value: 'JWT + Redis sessions 24h' },
];

function makeStat(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'su-stat';

  const lbl = document.createElement('span');
  lbl.className = 'su-label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'su-value';
  val.textContent = value;

  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

function makeLink(label: string, href: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = label;
  a.className = 'su-link';
  return a;
}

export default defineToolbarApp({
  init(canvas, app) {
    const style = document.createElement('style');
    style.textContent = [
      'astro-dev-toolbar-card { display: none; }',
      '.su-panel { padding: 12px; font-family: monospace; font-size: 13px; min-width: 280px; }',
      '.su-panel h3 { margin: 0 0 10px; font-size: 14px; color: #e8b44a; }',
      '.su-stat { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }',
      '.su-stat:last-of-type { border: none; }',
      '.su-label { color: #aaa; }',
      '.su-value { color: #fff; font-weight: bold; }',
      '.su-section { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); }',
      '.su-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }',
      '.su-link { color: #e8b44a; text-decoration: none; font-size: 12px; padding: 3px 8px; border: 1px solid #e8b44a; border-radius: 4px; }',
      '.su-link:hover { background: rgba(232,180,74,0.13); }',
    ].join('\n');
    canvas.appendChild(style);

    const card = document.createElement('astro-dev-toolbar-card');
    const panel = document.createElement('div');
    panel.className = 'su-panel';

    const title = document.createElement('h3');
    title.textContent = '🌙 Şanlıurfa.com DevTools';
    panel.appendChild(title);

    STATS.forEach(({ label, value }) => panel.appendChild(makeStat(label, value)));

    const section = document.createElement('div');
    section.className = 'su-section';
    section.appendChild(makeStat('Env', import.meta.env.NODE_ENV || 'development'));
    section.appendChild(makeStat('Site URL', import.meta.env.SITE_URL || 'http://localhost:4321'));
    panel.appendChild(section);

    const actions = document.createElement('div');
    actions.className = 'su-actions';
    QUICK_LINKS.forEach(({ label, href }) => actions.appendChild(makeLink(label, href)));
    panel.appendChild(actions);

    card.appendChild(panel);
    canvas.appendChild(card);

    app.onToggled(({ state }) => {
      card.style.display = state ? 'block' : 'none';
    });
  },
});
