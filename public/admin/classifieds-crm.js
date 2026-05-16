export function initClassifiedsCrm() {
  document.querySelectorAll('[data-classifieds-crm]').forEach((root) => {
    const CLASSIFIED_EXPORT_ORDER_KEY = 'sanliurfa-classified-export-order';
    const CLASSIFIED_FILTER_PREFS_KEY = 'sanliurfa-classified-filter-prefs';
    const CLASSIFIED_EXPORT_MODE_KEY = 'sanliurfa-classified-export-mode';
    const CLASSIFIED_SEARCH_HISTORY_KEY = 'sanliurfa-classified-search-history';
    const selected = new Set();
    let lastDuplicateIds = [];
    let currentRows = [];
    let lastUndoAction = null;

    const normalizeKey = (value) => String(value || '').trim().toLocaleLowerCase('tr-TR');
    const buildDuplicateMaps = (rows) => {
      const titleCounts = new Map();
      const phoneCounts = new Map();
      rows.forEach((row) => {
        const titleKey = normalizeKey(row.title);
        const phoneKey = normalizeKey(row.phone);
        if (titleKey) titleCounts.set(titleKey, (titleCounts.get(titleKey) || 0) + 1);
        if (phoneKey) phoneCounts.set(phoneKey, (phoneCounts.get(phoneKey) || 0) + 1);
      });
      return { titleCounts, phoneCounts };
    };

    const feedback = root.querySelector('[data-classifieds-feedback]');
    const feedbackText = root.querySelector('[data-classifieds-feedback-text]');
    const undoButton = root.querySelector('[data-classifieds-undo]');
    const searchInput = root.querySelector('[data-classifieds-search]');

    const setFeedback = (message, tone = 'neutral') => {
      if (!feedback) return;
      feedback.hidden = !message;
      if (feedbackText) feedbackText.textContent = message || '';
      feedback.dataset.tone = tone;
    };

    const getExportPresetMap = () => ({
      moderation: ['id', 'title', 'category', 'district', 'status', 'moderation_note'],
      risk: ['id', 'title', 'category', 'district', 'status', 'risk_score', 'reason_code', 'moderation_note'],
      contact: ['id', 'title', 'district', 'status', 'views', 'contacts', 'moderation_note'],
      duplicate: ['id', 'title', 'category', 'district', 'status', 'risk_score', 'reason_code'],
    });

    const getExportFieldContainer = () => root.querySelector('[data-classifieds-export-fields]');
    const getExportFieldLabels = () =>
      Array.from(getExportFieldContainer()?.querySelectorAll('label') || []).filter(
        (label) => !label.classList.contains('crm-export-preset'),
      );
    const getExportFieldOrder = () =>
      getExportFieldLabels()
        .map((label) => label.querySelector('input')?.value)
        .filter(Boolean);

    const persistExportFieldOrder = () => {
      try {
        window.localStorage.setItem(
          CLASSIFIED_EXPORT_ORDER_KEY,
          JSON.stringify(getExportFieldOrder()),
        );
      } catch {}
    };

    const getExportMode = () =>
      root.querySelector('[data-classifieds-export-mode]')?.value || 'preset';

    const persistExportMode = (mode) => {
      try {
        window.localStorage.setItem(CLASSIFIED_EXPORT_MODE_KEY, mode);
      } catch {}
    };

    const restoreExportMode = () => {
      try {
        const mode = window.localStorage.getItem(CLASSIFIED_EXPORT_MODE_KEY);
        const select = root.querySelector('[data-classifieds-export-mode]');
        if (mode && select?.querySelector(`option[value="${mode}"]`)) select.value = mode;
      } catch {}
    };

    const getSearchHistory = () => {
      try {
        const raw = JSON.parse(window.localStorage.getItem(CLASSIFIED_SEARCH_HISTORY_KEY) || '[]');
        return Array.isArray(raw)
          ? raw.filter((item) => typeof item === 'string' && item.trim())
          : [];
      } catch {
        return [];
      }
    };

    const persistFilterPrefs = () => {
      try {
        window.localStorage.setItem(
          CLASSIFIED_FILTER_PREFS_KEY,
          JSON.stringify({
            search: searchInput?.value || '',
            filter: root.querySelector('[data-classifieds-filter]')?.value || 'all',
            sort: root.querySelector('[data-classifieds-sort]')?.value || 'risk-desc',
          }),
        );
      } catch {}
    };

    const restoreFilterPrefs = () => {
      try {
        const raw = window.localStorage.getItem(CLASSIFIED_FILTER_PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const filterSelect = root.querySelector('[data-classifieds-filter]');
        const sortSelect = root.querySelector('[data-classifieds-sort]');
        if (typeof parsed.search === 'string' && searchInput) searchInput.value = parsed.search;
        if (parsed.filter && filterSelect?.querySelector(`option[value="${parsed.filter}"]`)) {
          filterSelect.value = parsed.filter;
        }
        if (parsed.sort && sortSelect?.querySelector(`option[value="${parsed.sort}"]`)) {
          sortSelect.value = parsed.sort;
        }
      } catch {}
    };

    const renderSearchHistory = () => {
      const history = getSearchHistory();
      const wrap = root.querySelector('[data-classifieds-search-history]');
      const list = root.querySelector('[data-classifieds-search-history-buttons]');
      const datalist = root.querySelector('[data-classifieds-search-history-list]');
      const clearButton = root.querySelector('[data-classifieds-search-history-clear]');
      const currentSearch = String(searchInput?.value || '').trim().toLocaleLowerCase('tr-TR');
      if (!wrap || !list || !datalist) return;
      wrap.hidden = history.length === 0;
      if (clearButton) clearButton.hidden = history.length === 0;
      list.innerHTML = '';
      datalist.innerHTML = '';
      history.forEach((term) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.searchHistoryTerm = term;
        button.dataset.active =
          term.trim().toLocaleLowerCase('tr-TR') === currentSearch ? 'true' : 'false';
        button.textContent = term;
        button.addEventListener('click', () => {
          if (searchInput) searchInput.value = term;
          persistFilterPrefs();
          renderSearchHistory();
          loadClassifiedRows();
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'crm-search-history-remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `${term} aramasini gecmisten kaldir`);
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          removeSearchHistoryItem(term);
          setFeedback('Secili arama gecmisten kaldirildi.', 'neutral');
        });
        button.appendChild(remove);
        list.appendChild(button);
        const option = document.createElement('option');
        option.value = term;
        datalist.appendChild(option);
      });
    };

    const persistSearchHistory = (value) => {
      const term = String(value || '').trim();
      if (!term) return;
      try {
        const next = [term, ...getSearchHistory().filter((item) => item !== term)].slice(0, 6);
        window.localStorage.setItem(CLASSIFIED_SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      renderSearchHistory();
    };

    const clearSearchHistory = () => {
      try {
        window.localStorage.removeItem(CLASSIFIED_SEARCH_HISTORY_KEY);
      } catch {}
      renderSearchHistory();
    };

    const removeSearchHistoryItem = (term) => {
      try {
        const next = getSearchHistory().filter((item) => item !== term);
        window.localStorage.setItem(CLASSIFIED_SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      if (String(searchInput?.value || '').trim() === term && searchInput) {
        searchInput.value = '';
        persistFilterPrefs();
      }
      renderSearchHistory();
    };

    const applyExportFieldOrder = (orderedValues) => {
      const container = getExportFieldContainer();
      if (!container || !Array.isArray(orderedValues) || !orderedValues.length) return;
      const labels = getExportFieldLabels();
      const labelMap = new Map(
        labels.map((label) => [label.querySelector('input')?.value, label]),
      );
      const anchor = container.querySelector('.crm-export-preset');
      orderedValues.forEach((value) => {
        const label = labelMap.get(value);
        if (label) container.appendChild(label);
      });
      labels.forEach((label) => {
        const value = label.querySelector('input')?.value;
        if (!orderedValues.includes(value)) container.appendChild(label);
      });
      if (anchor) container.insertBefore(anchor, container.firstChild);
    };

    const restorePersistedExportFieldOrder = () => {
      try {
        const raw = window.localStorage.getItem(CLASSIFIED_EXPORT_ORDER_KEY);
        if (!raw) return;
        applyExportFieldOrder(JSON.parse(raw));
      } catch {}
    };

    const initializeExportFieldControls = () => {
      root.querySelectorAll('[data-classifieds-export-fields] label').forEach((label) => {
        if (label.classList.contains('crm-export-preset')) return;
        if (label.querySelector('[data-export-move]')) return;
        const controls = document.createElement('span');
        controls.className = 'crm-export-move';
        controls.innerHTML =
          '<button type="button" data-export-move="up" aria-label="Kolonu yukarı taşı">↑</button><button type="button" data-export-move="down" aria-label="Kolonu aşağı taşı">↓</button>';
        label.appendChild(controls);
      });
      root.querySelectorAll('[data-export-move]').forEach((button) => {
        button.addEventListener('click', () => {
          const direction = button.getAttribute('data-export-move');
          const label = button.closest('label');
          const container = label?.parentElement;
          if (!label || !container) return;
          const labels = Array.from(container.querySelectorAll('label')).filter(
            (item) => !item.classList.contains('crm-export-preset'),
          );
          const index = labels.indexOf(label);
          if (index === -1) return;
          if (direction === 'up' && index > 0) {
            container.insertBefore(label, labels[index - 1]);
          }
          if (direction === 'down' && index < labels.length - 1) {
            container.insertBefore(labels[index + 1], label);
          }
          const modeSelect = root.querySelector('[data-classifieds-export-mode]');
          if (modeSelect) modeSelect.value = 'manual';
          persistExportFieldOrder();
          persistExportMode('manual');
          updateClassifiedReportUi();
        });
      });
    };

    const applyExportPreset = (preset) => {
      const nextColumns = getExportPresetMap()[preset];
      if (!nextColumns) return false;
      applyExportFieldOrder(nextColumns);
      root
        .querySelectorAll('[data-classifieds-export-fields] input[type="checkbox"]')
        .forEach((input) => {
          input.checked = nextColumns.includes(input.value);
        });
      const presetSelect = root.querySelector('[data-classifieds-export-preset]');
      if (presetSelect) presetSelect.value = preset;
      persistExportFieldOrder();
      return true;
    };

    const suggestExportPreset = () => {
      const filter = root.querySelector('[data-classifieds-filter]')?.value || 'all';
      if (filter === 'duplicate-only') return 'duplicate';
      if (
        filter === 'risk-only' ||
        filter === 'risk-high' ||
        filter === 'risk-medium' ||
        filter === 'risk-low'
      ) {
        return 'risk';
      }
      if (filter === 'phone-missing') return 'contact';
      return 'moderation';
    };

    const getPresetOverrideState = (preset, selectedColumns) => {
      const expected = getExportPresetMap()[preset] || [];
      if (!expected.length) {
        return { manualOverride: selectedColumns.length > 0, expectedColumns: expected };
      }
      const manualOverride =
        selectedColumns.length !== expected.length ||
        selectedColumns.some((column, index) => expected[index] !== column);
      return { manualOverride, expectedColumns: expected };
    };

    const slugifyExportToken = (value) =>
      String(value || 'all')
        .trim()
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    function getSignalFlags(row, duplicateMaps) {
      if (row.signal_flags) return row.signal_flags;
      return {
        phoneMissing: !row.phone,
        imageMissing: !Array.isArray(row.images) || row.images.length === 0,
        shortTitle: (row.title || '').length < 16,
        thinContent: (row.description || '').length < 80,
        spamTitle: /([A-Za-zÇĞİÖŞÜçğıöşü0-9])\1{3,}/.test(row.title || ''),
        duplicateTitle: (duplicateMaps.titleCounts.get(normalizeKey(row.title)) || 0) > 1,
        duplicatePhone:
          !!row.phone && (duplicateMaps.phoneCounts.get(normalizeKey(row.phone)) || 0) > 1,
        lowConversion: (row.view_count || 0) > 100 && (row.contact_count || 0) === 0,
      };
    }

    function renderSignals(row, duplicateMaps) {
      const flags = getSignalFlags(row, duplicateMaps);
      const parts = [];
      if (flags.phoneMissing) parts.push('<span class="crm-warn">Telefon eksik</span>');
      if (flags.imageMissing) parts.push('<span class="crm-warn">Görsel eksik</span>');
      if (flags.shortTitle) parts.push('<span class="crm-warn">Kısa başlık</span>');
      if (flags.thinContent) parts.push('<span class="crm-warn">İnce içerik</span>');
      if (flags.spamTitle) parts.push('<span class="crm-warn">Spam başlık</span>');
      if (flags.duplicateTitle) parts.push('<span class="crm-warn">Benzer başlık</span>');
      if (flags.duplicatePhone) parts.push('<span class="crm-warn">Tekrar telefon</span>');
      if (flags.lowConversion) parts.push('<span class="crm-status">Düşük dönüşüm</span>');
      return parts.length ? parts.join(' ') : '<span class="crm-ok">Temiz</span>';
    }

    function getRiskScore(row, duplicateMaps) {
      if (Number.isFinite(Number(row.risk_score))) return Number(row.risk_score);
      const flags = getSignalFlags(row, duplicateMaps);
      let score = 0;
      if (flags.phoneMissing) score += 18;
      if (flags.imageMissing) score += 14;
      if (flags.shortTitle) score += 9;
      if (flags.thinContent) score += 16;
      if (flags.spamTitle) score += 24;
      if (flags.duplicateTitle) score += 20;
      if (flags.duplicatePhone) score += 18;
      if (flags.lowConversion) score += 8;
      return Math.min(score, 100);
    }

    function getRiskTone(score) {
      if (score >= 60) return { label: 'Yüksek', className: 'crm-warn' };
      if (score >= 30) return { label: 'Orta', className: 'crm-status' };
      return { label: 'Düşük', className: 'crm-ok' };
    }

    const getVisibleClassifiedRows = (rows) => {
      const filter = root.querySelector('[data-classifieds-filter]')?.value || 'all';
      const sort = root.querySelector('[data-classifieds-sort]')?.value || 'risk-desc';
      const duplicateMaps = buildDuplicateMaps(rows);
      const visibleRows = rows.filter((row) => {
        const flags = getSignalFlags(row, duplicateMaps);
        const riskScore = getRiskScore(row, duplicateMaps);
        if (filter === 'pending') return row.status === 'pending';
        if (filter === 'active') return row.status === 'active';
        if (filter === 'rejected') return row.status === 'rejected';
        if (filter === 'archived') return row.status === 'archived';
        if (filter === 'phone-missing') return flags.phoneMissing;
        if (filter === 'image-missing') return flags.imageMissing;
        if (filter === 'risk-high') return riskScore >= 60;
        if (filter === 'risk-medium') return riskScore >= 30 && riskScore < 60;
        if (filter === 'risk-low') return riskScore < 30;
        if (filter === 'risk-only') return riskScore >= 30;
        if (filter === 'duplicate-only') return flags.duplicateTitle || flags.duplicatePhone;
        return true;
      });

      visibleRows.sort((a, b) => {
        if (sort === 'newest') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sort === 'views-desc') return (b.view_count || 0) - (a.view_count || 0);
        if (sort === 'contacts-desc') return (b.contact_count || 0) - (a.contact_count || 0);
        if (sort === 'duplicate-first') {
          const aFlags = getSignalFlags(a, duplicateMaps);
          const bFlags = getSignalFlags(b, duplicateMaps);
          const aDup = aFlags.duplicateTitle || aFlags.duplicatePhone ? 1 : 0;
          const bDup = bFlags.duplicateTitle || bFlags.duplicatePhone ? 1 : 0;
          return bDup - aDup || getRiskScore(b, duplicateMaps) - getRiskScore(a, duplicateMaps);
        }
        return getRiskScore(b, duplicateMaps) - getRiskScore(a, duplicateMaps);
      });

      return { visibleRows, duplicateMaps };
    };

    function renderDuplicateWatchlist(rootNode, rows, duplicateMaps) {
      const box = rootNode.querySelector('[data-classifieds-duplicates]');
      if (!box) return;
      box.replaceChildren();
      const duplicateRows = rows.filter((row) => {
        const flags = getSignalFlags(row, duplicateMaps);
        return flags.duplicateTitle || flags.duplicatePhone;
      });
      lastDuplicateIds = duplicateRows.map((row) => row.id).slice(0, 8);
      if (!duplicateRows.length) {
        const title = document.createElement('strong');
        title.textContent = 'Duplicate sinyali bulunmadı';
        const meta = document.createElement('p');
        meta.textContent = 'Başlık ve telefon alanlarında tekrar eden aktif risk sinyali yok.';
        const actions = rootNode.querySelector('.crm-duplicate-actions');
        box.append(title, meta);
        if (actions) box.append(actions);
        return;
      }
      const title = document.createElement('strong');
      title.textContent = `${duplicateRows.length} ilan duplicate inceleme kuyruğunda`;
      const meta = document.createElement('p');
      meta.textContent =
        'Başlık veya telefon tekrarı taşıyan ilanlar hızlı moderasyon için aşağıda gruplanır.';
      const list = document.createElement('div');
      list.className = 'crm-duplicate-list';
      duplicateRows.slice(0, 8).forEach((row) => {
        const flags = getSignalFlags(row, duplicateMaps);
        const item = document.createElement('article');
        item.className = 'crm-duplicate-item';
        const itemTitle = document.createElement('strong');
        itemTitle.textContent = row.title || 'Başlıksız ilan';
        const itemMeta = document.createElement('p');
        const parts = [];
        if (flags.duplicateTitle) parts.push('başlık tekrarı');
        if (flags.duplicatePhone) parts.push('telefon tekrarı');
        itemMeta.textContent = `${row.district || 'İlçe yok'} · ${parts.join(' + ')} · ${row.owner_email || 'e-posta yok'}`;
        const link = document.createElement('a');
        link.href = `/ilanlar/${row.slug}`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'İlanı aç';
        item.append(itemTitle, itemMeta, link);
        list.appendChild(item);
      });
      const actions = rootNode.querySelector('.crm-duplicate-actions');
      box.append(title, meta, list);
      if (actions) box.append(actions);
    }

    function renderModerationTimeline(rootNode, rows) {
      const box = rootNode.querySelector('[data-classifieds-timeline]');
      if (!box) return;
      box.replaceChildren();
      const timelineRows = rows
        .filter((row) => row.moderated_at || row.moderation_note)
        .sort(
          (a, b) =>
            new Date(b.moderated_at || b.updated_at || 0).getTime() -
            new Date(a.moderated_at || a.updated_at || 0).getTime(),
        )
        .slice(0, 6);
      if (!timelineRows.length) {
        const title = document.createElement('strong');
        title.textContent = 'Moderasyon geçmişi henüz oluşmadı';
        const meta = document.createElement('p');
        meta.textContent =
          'Bu listedeki ilanlar için moderasyon notu veya işlem zamanı kaydı bulunmuyor.';
        box.append(title, meta);
        return;
      }
      const title = document.createElement('strong');
      title.textContent = 'Son moderasyon zaman çizelgesi';
      const list = document.createElement('div');
      list.className = 'crm-timeline-list';
      timelineRows.forEach((row) => {
        const item = document.createElement('article');
        item.className = 'crm-timeline-item';
        const head = document.createElement('strong');
        head.textContent = row.title || 'Başlıksız ilan';
        const badge = document.createElement('span');
        badge.className =
          row.status === 'active'
            ? 'crm-ok'
            : row.status === 'rejected'
              ? 'crm-warn'
              : 'crm-status';
        badge.textContent = row.status || 'durum yok';
        const meta = document.createElement('p');
        meta.textContent = `${row.status || '-'} · ${row.moderated_at ? new Date(row.moderated_at).toLocaleString('tr-TR') : 'zaman yok'}${row.moderated_by ? ` · ${row.moderated_by}` : ''}`;
        const note = document.createElement('span');
        note.textContent = row.moderation_note || 'Moderasyon notu girilmemiş.';
        item.append(head, badge, meta, note);
        list.appendChild(item);
      });
      box.append(title, list);
    }

    function renderReasonSummary(rootNode, rows) {
      const box = rootNode.querySelector('[data-classifieds-reasons]');
      if (!box) return;
      const counts = new Map();
      rows.forEach((row) => {
        const note = String(row.moderation_note || '');
        const match = note.match(/^\[([A-Z_]+)\]/);
        const code = match?.[1] || 'NO_CODE';
        counts.set(code, (counts.get(code) || 0) + 1);
      });
      box.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = 'Moderasyon sebebi özeti';
      const intro = document.createElement('p');
      intro.textContent = counts.size
        ? 'Görünür ilan listesindeki moderasyon notları bu sebep kodlarına göre kümelendi.'
        : 'Henüz moderasyon notu içeren kayıt görünmüyor.';
      box.append(title, intro);
      if (!counts.size) return;
      const list = document.createElement('div');
      list.className = 'crm-reason-list';
      Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          const item = document.createElement('article');
          item.className = 'crm-reason-item';
          const codeEl = document.createElement('strong');
          codeEl.textContent = code;
          const countEl = document.createElement('span');
          countEl.textContent = `${count} kayıt`;
          item.append(codeEl, countEl);
          list.appendChild(item);
        });
      box.appendChild(list);
    }

    function renderRiskSummary(rootNode, rows, duplicateMaps) {
      const box = rootNode.querySelector('[data-classifieds-risk-summary]');
      if (!box) return;
      const districtScores = new Map();
      const categoryScores = new Map();
      rows.forEach((row) => {
        const riskScore = getRiskScore(row, duplicateMaps);
        const districtKey = row.district || 'Bilinmeyen ilçe';
        const categoryKey = row.category_name || 'Bilinmeyen kategori';
        districtScores.set(districtKey, [...(districtScores.get(districtKey) || []), riskScore]);
        categoryScores.set(categoryKey, [...(categoryScores.get(categoryKey) || []), riskScore]);
      });
      const toTopItems = (map) =>
        Array.from(map.entries())
          .map(([name, scores]) => ({
            name,
            avg: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
            count: scores.length,
          }))
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 4);
      const topDistricts = toTopItems(districtScores);
      const topCategories = toTopItems(categoryScores);
      box.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = 'İlçe ve kategori risk kümeleri';
      const intro = document.createElement('p');
      intro.textContent =
        'En yüksek ortalama risk sinyaline sahip kümeler görünür liste üzerinden hesaplanır.';
      box.append(title, intro);
      const grid = document.createElement('div');
      grid.className = 'crm-risk-grid';
      const appendGroup = (heading, items) => {
        const section = document.createElement('section');
        section.className = 'crm-risk-group';
        const h4 = document.createElement('h4');
        h4.textContent = heading;
        section.appendChild(h4);
        if (!items.length) {
          const empty = document.createElement('p');
          empty.textContent = 'Veri yok.';
          section.appendChild(empty);
        } else {
          items.forEach((item) => {
            const article = document.createElement('article');
            article.className = 'crm-risk-item';
            const strong = document.createElement('strong');
            strong.textContent = item.name;
            const score = document.createElement('span');
            score.textContent = `${item.avg}/100 ortalama risk · ${item.count} kayıt`;
            article.append(strong, score);
            section.appendChild(article);
          });
        }
        grid.appendChild(section);
      };
      appendGroup('İlçe riski yüksek kümeler', topDistricts);
      appendGroup('Kategori riski yüksek kümeler', topCategories);
      box.appendChild(grid);
    }

    function renderRiskTrend(rootNode, rows, duplicateMaps) {
      const box = rootNode.querySelector('[data-classifieds-risk-trend]');
      if (!box) return;
      const weeklyMap = new Map();
      rows.forEach((row) => {
        const dateValue = row.moderated_at || row.created_at;
        if (!dateValue) return;
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return;
        const weekKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const arr = weeklyMap.get(weekKey) || [];
        arr.push(getRiskScore(row, duplicateMaps));
        weeklyMap.set(weekKey, arr);
      });
      const trendRows = Array.from(weeklyMap.entries())
        .map(([date, scores]) => ({
          date,
          avg: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
          count: scores.length,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      box.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = 'Zaman bazlı risk trendi';
      const intro = document.createElement('p');
      intro.textContent = trendRows.length
        ? 'Son günlerdeki ortalama risk puanı ve kayıt yoğunluğu burada izlenir.'
        : 'Trend üretmek için yeterli zaman damgalı kayıt yok.';
      box.append(title, intro);
      if (!trendRows.length) return;
      const list = document.createElement('div');
      list.className = 'crm-trend-list';
      trendRows.forEach((item) => {
        const row = document.createElement('article');
        row.className = 'crm-trend-item';
        const strong = document.createElement('strong');
        strong.textContent = new Date(item.date).toLocaleDateString('tr-TR');
        const bar = document.createElement('div');
        bar.className = 'crm-trend-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.max(4, Math.min(item.avg, 100))}%`;
        bar.appendChild(fill);
        const meta = document.createElement('span');
        meta.textContent = `${item.avg}/100 ortalama risk · ${item.count} kayıt`;
        row.append(strong, bar, meta);
        list.appendChild(row);
      });
      box.appendChild(list);
    }

    function renderClassifiedRows(rootNode, rows) {
      const body = rootNode.querySelector('[data-classifieds-body]');
      const { visibleRows, duplicateMaps } = getVisibleClassifiedRows(rows);
      if (!body) return;
      body.replaceChildren();
      renderDuplicateWatchlist(rootNode, visibleRows, duplicateMaps);
      renderModerationTimeline(rootNode, visibleRows);
      renderReasonSummary(rootNode, visibleRows);
      renderRiskSummary(rootNode, visibleRows, duplicateMaps);
      renderRiskTrend(rootNode, visibleRows, duplicateMaps);

      if (!visibleRows.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.textContent = 'İlan kaydı bulunamadı.';
        tr.appendChild(td);
        body.appendChild(tr);
        return;
      }

      visibleRows.forEach((row) => {
        const tr = document.createElement('tr');
        const selectTd = document.createElement('td');
        const titleTd = document.createElement('td');
        const riskTd = document.createElement('td');
        const categoryTd = document.createElement('td');
        const locationTd = document.createElement('td');
        const ownerTd = document.createElement('td');
        const statusTd = document.createElement('td');
        const actionTd = document.createElement('td');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.classifiedsId = row.id;
        checkbox.checked = selected.has(row.id);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selected.add(row.id);
          else selected.delete(row.id);
          updateBulk();
        });
        selectTd.appendChild(checkbox);

        const title = document.createElement('strong');
        title.textContent = row.title || 'Başlıksız ilan';
        const price = document.createElement('span');
        price.textContent = row.price
          ? `${Number(row.price).toLocaleString('tr-TR')} TL`
          : 'Fiyat belirtilmedi';
        const signalMeta = document.createElement('div');
        signalMeta.innerHTML = renderSignals(row, duplicateMaps);
        titleTd.append(title, price, signalMeta);

        const riskScore = getRiskScore(row, duplicateMaps);
        const riskTone = getRiskTone(riskScore);
        const riskValue = document.createElement('strong');
        riskValue.textContent = `${riskScore}/100`;
        const riskState = document.createElement('span');
        riskState.className = riskTone.className;
        riskState.textContent = riskTone.label;
        const riskHint = document.createElement('small');
        riskHint.textContent = renderSignals(row, duplicateMaps).replace(/<[^>]+>/g, ' ').trim();
        riskTd.append(riskValue, riskState, riskHint);

        categoryTd.textContent = `${row.parent_category_name ? `${row.parent_category_name} / ` : ''}${row.category_name || '-'}`;
        locationTd.textContent = `${row.city || 'Şanlıurfa'} / ${row.district || '-'}${row.neighborhood ? ` / ${row.neighborhood}` : ''}`;

        const ownerName = document.createElement('strong');
        ownerName.textContent = row.owner_name || 'Üye';
        const ownerMeta = document.createElement('small');
        ownerMeta.textContent = `${row.owner_email || 'e-posta yok'}${row.phone ? ` · ${row.phone}` : ' · telefon yok'}`;
        const noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.value = row.moderation_note || '';
        noteInput.placeholder = 'Moderasyon notu / red sebebi';
        noteInput.maxLength = 400;
        const moderationMeta = document.createElement('small');
        moderationMeta.textContent = row.moderated_at
          ? `Son moderasyon: ${new Date(row.moderated_at).toLocaleString('tr-TR')}${row.moderated_by ? ` · ${row.moderated_by}` : ''}`
          : 'Moderasyon geçmişi yok';
        ownerTd.append(ownerName, ownerMeta, moderationMeta, noteInput);

        const status = document.createElement('select');
        status.name = 'status';
        ['pending', 'active', 'rejected', 'archived', 'expired'].forEach((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          option.selected = row.status === value;
          status.appendChild(option);
        });
        const metrics = document.createElement('small');
        metrics.textContent = `${row.view_count || 0} görüntüleme · ${row.contact_count || 0} iletişim`;
        statusTd.append(status, metrics);

        const preview = document.createElement('a');
        preview.href = `/ilanlar/${row.slug}`;
        preview.target = '_blank';
        preview.rel = 'noopener';
        preview.className = 'crm-row-link';
        preview.textContent = 'Önizle';
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'crm-row-save';
        save.textContent = 'Kaydet';

        const persist = async (nextStatus) => {
          save.textContent = 'Kaydediliyor...';
          if (nextStatus) status.value = nextStatus;
          const payload = {
            id: row.id,
            status: status.value,
            moderation_note: noteInput.value.trim() || null,
          };
          try {
            const res = await fetch('/api/admin/crm/classified-listings', {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await res.json();
            save.textContent = res.ok && result.data?.success ? 'Kaydedildi' : 'Hata';
            if (res.ok && result.data?.item) {
              row.status = result.data.item.status;
              row.published_at = result.data.item.published_at;
              row.moderation_note = result.data.item.moderation_note;
            }
          } catch {
            save.textContent = 'Hata';
          }
        };

        save.addEventListener('click', async () => persist());
        const approve = document.createElement('button');
        approve.type = 'button';
        approve.className = 'crm-row-save';
        approve.textContent = 'Yayına al';
        approve.addEventListener('click', async () => persist('active'));
        const reject = document.createElement('button');
        reject.type = 'button';
        reject.className = 'crm-row-save';
        reject.textContent = 'Reddet';
        reject.addEventListener('click', async () => persist('rejected'));
        actionTd.append(preview, approve, reject, save);

        tr.append(selectTd, titleTd, riskTd, categoryTd, locationTd, ownerTd, statusTd, actionTd);
        body.appendChild(tr);
      });
    }

    const updateBulk = () => {
      const bulk = root.querySelector('[data-classifieds-bulk]');
      const selectedCount = root.querySelector('[data-classifieds-selected]');
      if (selectedCount) selectedCount.textContent = String(selected.size);
      if (bulk) bulk.hidden = selected.size === 0;
    };

    const updateClassifiedReportUi = () => {
      const { visibleRows, duplicateMaps } = getVisibleClassifiedRows(currentRows);
      const selectedColumns = Array.from(
        root.querySelectorAll('[data-classifieds-export-fields] input:checked'),
      ).map((input) => input.value);
      const summary = root.querySelector('[data-classifieds-export-summary]');
      if (summary) {
        const preset =
          root.querySelector('[data-classifieds-export-preset]')?.value || suggestExportPreset();
        const { manualOverride, expectedColumns } = getPresetOverrideState(
          preset,
          selectedColumns,
        );
        const exportMode = getExportMode();
        const filter = root.querySelector('[data-classifieds-filter]')?.value || 'all';
        const sort = root.querySelector('[data-classifieds-sort]')?.value || 'risk-desc';
        const estimatedChars = visibleRows.reduce((sum, row) => {
          return sum + JSON.stringify(row).length;
        }, 0);
        const estimatedKb = Math.max(
          1,
          Math.round((estimatedChars + visibleRows.length * selectedColumns.length * 3) / 1024),
        );
        const headerPreview = selectedColumns.join(',');
        const firstPreviewMap = visibleRows[0]
          ? {
              id: visibleRows[0].id,
              title: visibleRows[0].title || '',
              category: visibleRows[0].category_name || '',
              district: visibleRows[0].district || '',
              status: visibleRows[0].status || '',
              risk_score: String(visibleRows[0].risk_score ?? getRiskScore(visibleRows[0], duplicateMaps)),
              views: String(visibleRows[0].view_count || 0),
              contacts: String(visibleRows[0].contact_count || 0),
              reason_code:
                visibleRows[0].reason_code ||
                String(visibleRows[0].moderation_note || '').match(/^\[([A-Z_]+)\]/)?.[1] ||
                '',
              moderation_note: visibleRows[0].moderation_note || '',
            }
          : null;
        const firstPreview = firstPreviewMap
          ? selectedColumns.map((column) => firstPreviewMap[column] ?? '').join(',')
          : 'örnek kayıt yok';
        const missingColumns = expectedColumns.filter((column) => !selectedColumns.includes(column));
        const extraColumns = selectedColumns.filter((column) => !expectedColumns.includes(column));
        const orderOnlyOverride =
          manualOverride && missingColumns.length === 0 && extraColumns.length === 0;
        summary.innerHTML = `<code>Görünür kayıt: ${visibleRows.length}</code><code>Kolon: ${selectedColumns.length}</code><code>Preset: ${preset}</code><code>Mod: ${exportMode}</code><code>Filtre: ${filter}</code><code>Sıralama: ${sort}</code><code>Tahmini CSV: ${visibleRows.length} satır · ~${estimatedKb} KB</code><code>Başlık satırı: ${headerPreview}</code><code>Örnek veri satırı: ${firstPreview}</code>${manualOverride ? `<code>Presetten eksik kolonlar: ${missingColumns.join(',') || 'yok'}</code><code>Presette olmayan kolonlar: ${extraColumns.join(',') || 'yok'}</code>${orderOnlyOverride ? '<code>Sadece kolon sırası değişti.</code>' : ''}` : ''}`;
      }

      const grid = root.querySelector('[data-classifieds-report-grid]');
      if (!grid) return;
      const activeFilter = root.querySelector('[data-classifieds-filter]')?.value || 'all';
      const highRiskCount = visibleRows.filter((row) => getRiskScore(row, duplicateMaps) >= 60).length;
      const duplicateCount = visibleRows.filter((row) => {
        const flags = getSignalFlags(row, duplicateMaps);
        return flags.duplicateTitle || flags.duplicatePhone;
      }).length;
      const activeCount = visibleRows.filter((row) => row.status === 'active').length;
      const pendingCount = visibleRows.filter((row) => row.status === 'pending').length;
      const mediumRiskCount = visibleRows.filter((row) => {
        const score = getRiskScore(row, duplicateMaps);
        return score >= 30 && score < 60;
      }).length;
      const phoneMissingCount = visibleRows.filter((row) => !row.phone).length;
      const imageMissingCount = visibleRows.filter(
        (row) => !Array.isArray(row.images) || row.images.length === 0,
      ).length;
      const riskHead = root.querySelector('[data-classifieds-risk-head]');
      const statusHead = root.querySelector('[data-classifieds-status-head]');
      if (riskHead) riskHead.textContent = `${highRiskCount} yüksek · ${mediumRiskCount} orta`;
      if (statusHead) statusHead.textContent = `${activeCount} aktif / ${pendingCount} bekleyen`;
      grid.innerHTML = `
        <button type="button" data-report-filter="all"><strong>${visibleRows.length}</strong><span>Görünür kayıt</span></button>
        <button type="button" data-report-filter="risk-high"><strong>${highRiskCount}</strong><span>Yüksek risk</span></button>
        <button type="button" data-report-filter="risk-medium"><strong>${mediumRiskCount}</strong><span>Orta risk</span></button>
        <button type="button" data-report-filter="duplicate-only"><strong>${duplicateCount}</strong><span>Duplicate</span></button>
        <button type="button" data-report-filter="active"><strong>${activeCount}/${pendingCount}</strong><span>Yayında / bekleyen</span></button>
        <button type="button" data-report-filter="pending"><strong>${pendingCount}</strong><span>Bekleyen</span></button>
        <button type="button" data-report-filter="phone-missing"><strong>${phoneMissingCount}</strong><span>Telefon eksik</span></button>
        <button type="button" data-report-filter="image-missing"><strong>${imageMissingCount}</strong><span>Görsel eksik</span></button>
      `;
      grid.querySelectorAll('[data-report-filter]').forEach((button) => {
        button.dataset.active =
          button.getAttribute('data-report-filter') === activeFilter ? 'true' : 'false';
        button.addEventListener('click', () => {
          const filter = button.getAttribute('data-report-filter') || 'all';
          const filterSelect = root.querySelector('[data-classifieds-filter]');
          if (!filterSelect) return;
          filterSelect.value = filter;
          applyExportPreset(suggestExportPreset());
          updateClassifiedReportUi();
          loadClassifiedRows();
        });
      });
    };

    async function loadClassifiedRows() {
      const body = root.querySelector('[data-classifieds-body]');
      if (!body) return;
      body.innerHTML = '<tr><td colspan="8">Yükleniyor...</td></tr>';
      const search = searchInput?.value || '';
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('q', search);
      try {
        const res = await fetch(`/api/admin/crm/classified-listings?${params.toString()}`);
        const payload = await res.json();
        currentRows = payload.data?.items || [];
        if (search) persistSearchHistory(search);
        renderClassifiedRows(root, currentRows);
        updateBulk();
        updateClassifiedReportUi();
        setFeedback('');
        if (undoButton) undoButton.hidden = true;
      } catch {
        body.innerHTML = '<tr><td colspan="8">İlanlar yüklenemedi.</td></tr>';
        updateClassifiedReportUi();
        setFeedback('İlanlar yüklenemedi.', 'error');
      }
    }

    const runBulkMutation = async ({ ids, status, moderationNote, button, successMessage }) => {
      if (!ids?.length || !status) return;
      const previousLabel = button?.textContent || '';
      const beforeMap = new Map(
        currentRows
          .filter((row) => ids.includes(row.id))
          .map((row) => [row.id, { status: row.status, moderation_note: row.moderation_note || null }]),
      );
      if (button) button.textContent = 'İşleniyor...';
      setFeedback('Moderasyon işlemi uygulanıyor...', 'progress');
      try {
        const response = await fetch('/api/admin/crm/classified-listings', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids, status, moderation_note: moderationNote }),
        });
        if (!response.ok) throw new Error('mutation-failed');
        selected.clear();
        updateBulk();
        if (button) button.textContent = 'Tamamlandı';
        lastUndoAction = {
          items: Array.from(beforeMap.entries()).map(([id, state]) => ({ id, ...state })),
        };
        setFeedback(successMessage || 'Moderasyon işlemi tamamlandı.', 'success');
        if (undoButton) undoButton.hidden = beforeMap.size === 0;
        await loadClassifiedRows();
      } catch {
        if (button) button.textContent = 'Hata';
        setFeedback('Moderasyon işlemi uygulanamadı.', 'error');
      } finally {
        if (button) {
          window.setTimeout(() => {
            button.textContent = previousLabel;
          }, 1200);
        }
      }
    };

    root.querySelector('[data-classifieds-all]')?.addEventListener('change', (event) => {
      const checked = event.target.checked;
      root.querySelectorAll('[data-classifieds-id]').forEach((input) => {
        input.checked = checked;
        if (checked) selected.add(input.dataset.classifiedsId);
        else selected.delete(input.dataset.classifiedsId);
      });
      updateBulk();
    });

    root.querySelectorAll('[data-classifieds-load]').forEach((button) => {
      button.addEventListener('click', loadClassifiedRows);
    });

    root.querySelector('[data-classifieds-export]')?.addEventListener('click', () => {
      if (!currentRows.length) {
        setFeedback('Dışa aktarmak için önce ilanları yükleyin.', 'error');
        return;
      }
      const selectedColumns = Array.from(
        root.querySelectorAll('[data-classifieds-export-fields] input:checked'),
      ).map((input) => input.value);
      if (!selectedColumns.length) {
        setFeedback('Dışa aktarmak için en az bir kolon seçin.', 'error');
        return;
      }
      const { visibleRows, duplicateMaps } = getVisibleClassifiedRows(currentRows);
      if (!visibleRows.length) {
        setFeedback('Mevcut filtrelerde dışa aktarılacak ilan yok.', 'error');
        return;
      }
      const rowMap = (row) => {
        const reasonCode =
          row.reason_code ||
          String(row.moderation_note || '').match(/^\[([A-Z_]+)\]/)?.[1] ||
          '';
        return {
          id: row.id,
          title: row.title || '',
          category: row.category_name || '',
          district: row.district || '',
          status: row.status || '',
          risk_score: String(row.risk_score ?? getRiskScore(row, duplicateMaps)),
          views: String(row.view_count || 0),
          contacts: String(row.contact_count || 0),
          reason_code: reasonCode,
          moderation_note: row.moderation_note || '',
        };
      };
      const csvRows = [
        selectedColumns.join(','),
        ...visibleRows.map((row) => {
          const mapped = rowMap(row);
          const values = selectedColumns.map((column) => mapped[column] ?? '');
          return values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',');
        }),
      ];
      const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filter = root.querySelector('[data-classifieds-filter]')?.value || 'all';
      const sort = root.querySelector('[data-classifieds-sort]')?.value || 'risk-desc';
      const preset =
        root.querySelector('[data-classifieds-export-preset]')?.value || suggestExportPreset();
      anchor.href = url;
      anchor.download = `classified-${slugifyExportToken(filter)}-${slugifyExportToken(sort)}-${slugifyExportToken(preset)}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setFeedback('Görünür moderasyon listesi CSV olarak dışa aktarıldı.', 'success');
    });

    root.querySelector('[data-classifieds-export-preset]')?.addEventListener('change', (event) => {
      const preset = event.target.value;
      if (!applyExportPreset(preset)) return;
      const modeSelect = root.querySelector('[data-classifieds-export-mode]');
      if (modeSelect) modeSelect.value = 'preset';
      persistExportMode('preset');
      updateClassifiedReportUi();
      setFeedback('Export kolon preset’i uygulandı.', 'neutral');
    });

    root.querySelector('[data-classifieds-export-mode]')?.addEventListener('change', (event) => {
      const mode = event.target.value || 'preset';
      persistExportMode(mode);
      if (mode === 'preset') {
        applyExportPreset(
          root.querySelector('[data-classifieds-export-preset]')?.value || suggestExportPreset(),
        );
      }
      updateClassifiedReportUi();
    });

    root
      .querySelectorAll('[data-classifieds-export-fields] input[type="checkbox"]')
      .forEach((input) => {
        input.addEventListener('change', () => {
          if (getExportMode() !== 'manual') {
            const modeSelect = root.querySelector('[data-classifieds-export-mode]');
            if (modeSelect) modeSelect.value = 'manual';
            persistExportMode('manual');
          }
          persistExportFieldOrder();
          updateClassifiedReportUi();
        });
      });

    searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        persistFilterPrefs();
        loadClassifiedRows();
      }
      if (event.key === 'ArrowDown') {
        const firstHistoryButton = root.querySelector('[data-search-history-term]');
        if (firstHistoryButton instanceof HTMLElement) {
          event.preventDefault();
          firstHistoryButton.focus();
        }
      }
      if (event.key === 'Escape') {
        if (!searchInput.value) return;
        searchInput.value = '';
        persistFilterPrefs();
        renderSearchHistory();
      }
    });

    searchInput?.addEventListener('input', () => {
      persistFilterPrefs();
      renderSearchHistory();
    });

    root.querySelector('[data-classifieds-search-history-clear]')?.addEventListener('click', () => {
      clearSearchHistory();
      setFeedback('Arama gecmisi temizlendi.', 'neutral');
    });

    root.querySelector('[data-classifieds-filter]')?.addEventListener('change', () => {
      persistFilterPrefs();
      if (getExportMode() === 'preset') applyExportPreset(suggestExportPreset());
      updateClassifiedReportUi();
      loadClassifiedRows();
    });

    root.querySelector('[data-classifieds-sort]')?.addEventListener('change', () => {
      persistFilterPrefs();
      updateClassifiedReportUi();
      loadClassifiedRows();
    });

    root.querySelectorAll('[data-head-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-head-filter') || 'all';
        const filterSelect = root.querySelector('[data-classifieds-filter]');
        if (!filterSelect) return;
        filterSelect.value = filter;
        applyExportPreset(suggestExportPreset());
        updateClassifiedReportUi();
        loadClassifiedRows();
      });
    });

    root.querySelector('[data-duplicate-select]')?.addEventListener('click', () => {
      if (!lastDuplicateIds.length) return;
      root.querySelectorAll('[data-classifieds-id]').forEach((input) => {
        const id = input.dataset.classifiedsId;
        if (!id || !lastDuplicateIds.includes(id)) return;
        input.checked = true;
        selected.add(id);
      });
      updateBulk();
    });

    root.querySelectorAll('[data-classifieds-bulk-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!selected.size) return;
        const nextStatus = button.getAttribute('data-classifieds-bulk-action');
        const template = root.querySelector('[data-classifieds-note-template]')?.value || '';
        const reasonCode = root.querySelector('[data-classifieds-reason-code]')?.value || '';
        const baseNote = template || (nextStatus === 'rejected' ? 'Toplu moderasyon: red' : null);
        const note =
          reasonCode && baseNote
            ? `[${reasonCode}] ${baseNote}`
            : reasonCode
              ? `[${reasonCode}]`
              : baseNote;
        await runBulkMutation({
          ids: Array.from(selected),
          status: nextStatus,
          moderationNote: note,
          button,
          successMessage: 'Toplu moderasyon işlemi tamamlandı.',
        });
      });
    });

    undoButton?.addEventListener('click', async () => {
      if (!lastUndoAction?.items?.length) return;
      undoButton.textContent = 'Geri alınıyor...';
      setFeedback('Son moderasyon işlemi geri alınıyor...', 'progress');
      try {
        await Promise.all(
          lastUndoAction.items.map((item) =>
            fetch('/api/admin/crm/classified-listings', {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: item.id,
                status: item.status,
                moderation_note: item.moderation_note,
              }),
            }),
          ),
        );
        setFeedback('Son moderasyon işlemi geri alındı.', 'success');
        lastUndoAction = null;
        undoButton.hidden = true;
        await loadClassifiedRows();
      } catch {
        setFeedback('Geri alma işlemi tamamlanamadı.', 'error');
      } finally {
        undoButton.textContent = 'Son işlemi geri al';
      }
    });

    root.querySelectorAll('[data-classifieds-preset]').forEach((button) => {
      button.addEventListener('click', async () => {
        const preset = button.getAttribute('data-classifieds-preset');
        const noteTemplate = root.querySelector('[data-classifieds-note-template]');
        const reasonCode = root.querySelector('[data-classifieds-reason-code]');
        const presetStatus = button.getAttribute('data-classifieds-preset-status');
        if (preset === 'quick-approve') {
          if (noteTemplate) {
            noteTemplate.value =
              'Başlık, fiyat ve kategori alanları kontrol edilerek yayına alındı.';
          }
          if (reasonCode) reasonCode.value = 'APPROVED_QA';
        } else if (preset === 'send-revision') {
          if (noteTemplate) noteTemplate.value = 'Eksik görsel ve açıklama nedeniyle revizyon gerekli.';
          if (reasonCode) reasonCode.value = 'REV_MEDIA';
        } else if (preset === 'mark-duplicate') {
          if (noteTemplate) {
            noteTemplate.value = 'Duplicate/kalite sinyali nedeniyle manuel incelemeye alındı.';
          }
          if (reasonCode) reasonCode.value = 'DUP_REVIEW';
        }
        if (!selected.size || !presetStatus) {
          setFeedback(
            'Şablon dolduruldu. Uygulamak için ilan seçin veya toplu aksiyon butonunu kullanın.',
            'neutral',
          );
          return;
        }
        const template = noteTemplate?.value || '';
        const code = reasonCode?.value || '';
        const note = code && template ? `[${code}] ${template}` : code ? `[${code}]` : template;
        await runBulkMutation({
          ids: Array.from(selected),
          status: presetStatus,
          moderationNote: note,
          button,
          successMessage: 'Preset moderasyon işlemi tamamlandı.',
        });
      });
    });

    root.querySelectorAll('[data-duplicate-bulk]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!lastDuplicateIds.length) return;
        const nextStatus = button.getAttribute('data-duplicate-bulk');
        const note =
          nextStatus === 'rejected'
            ? 'Duplicate inceleme akışı: red'
            : 'Duplicate inceleme akışı';
        await runBulkMutation({
          ids: lastDuplicateIds,
          status: nextStatus,
          moderationNote: note,
          button,
          successMessage: 'Duplicate inceleme aksiyonu tamamlandı.',
        });
      });
    });

    restoreFilterPrefs();
    restoreExportMode();
    restorePersistedExportFieldOrder();
    renderSearchHistory();
    initializeExportFieldControls();
    if (getExportMode() === 'preset') {
      applyExportPreset(
        root.querySelector('[data-classifieds-export-preset]')?.value || suggestExportPreset(),
      );
    }
    loadClassifiedRows();
  });
}
