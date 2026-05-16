function renderAdSenseSmoke(root, payload) {
  const statusEl = root.querySelector('[data-adsense-live-status]');
  const metaEl = root.querySelector('[data-adsense-live-meta]');
  const listEl = root.querySelector('[data-adsense-live-list]');
  const summary = payload?.summary;
  const rows = Array.isArray(summary?.rows) ? summary.rows : [];
  const okCount = rows.filter((row) => row?.smoke?.ok).length;
  const failedCount = rows.length - okCount;
  const lastChecked = summary?.smokeGeneratedAt || payload?.generatedAt || '';

  if (statusEl) {
    statusEl.textContent =
      rows.length === 0
        ? 'Smoke sonucu bulunamadı.'
        : failedCount === 0
          ? `Smoke başarılı: ${okCount}/${rows.length} yerleşim doğrulandı.`
          : `Smoke uyarısı: ${failedCount} yerleşim doğrulanamadı.`;
  }

  if (metaEl) {
    metaEl.textContent = `DB ${summary?.dbSlotCount ?? 0} · ENV ${summary?.envSlotCount ?? 0} · boş ${summary?.emptySlotCount ?? 0}${lastChecked ? ` · son kontrol ${lastChecked}` : ''}`;
  }

  if (listEl) {
    listEl.innerHTML = rows
      .map((row) => {
        const smoke = row?.smoke || {};
        const label = String(row?.label || 'Yerleşim');
        const note = String(smoke.note || 'Not yok');
        const url = smoke.url ? `<a href="${smoke.url}" target="_blank" rel="noopener">Aç</a>` : '';
        const badge = smoke.ok
          ? '<span class="crm-ok">OK</span>'
          : '<span class="crm-status">Kontrol et</span>';
        return `
          <div class="crm-timeline-item">
            <strong>${label} ${badge}</strong>
            <span>${note}</span>
            ${url ? `<span>${url}</span>` : ''}
          </div>
        `;
      })
      .join('');
  }
}

async function loadAdSenseSmoke(root, method = 'GET') {
  const statusEl = root.querySelector('[data-adsense-live-status]');
  const metaEl = root.querySelector('[data-adsense-live-meta]');
  const listEl = root.querySelector('[data-adsense-live-list]');

  if (method === 'POST') {
    if (statusEl) statusEl.textContent = 'AdSense smoke çalışıyor...';
    if (metaEl) metaEl.textContent = 'Public reklam yüzeyleri yeniden doğrulanıyor.';
    if (listEl) listEl.innerHTML = '';
  }

  try {
    const res = await fetch('/api/admin/adsense/summary', { method, cache: 'no-store' });
    if (!res.ok) {
      throw new Error('summary-failed');
    }
    const payload = await res.json();
    renderAdSenseSmoke(root, payload);
  } catch {
    if (statusEl) statusEl.textContent = 'AdSense smoke özeti alınamadı.';
    if (metaEl) metaEl.textContent = 'Admin API yanıt vermedi veya yetki hatası oluştu.';
  }
}

export function initAdsenseLive() {
  document.querySelectorAll('[data-adsense-live]').forEach((root) => {
    root.querySelectorAll('[data-adsense-refresh]').forEach((button) => {
      button.addEventListener('click', () => loadAdSenseSmoke(root, 'POST'));
    });
    loadAdSenseSmoke(root, 'GET');
  });
}
