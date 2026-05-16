const STANDARD_COLUMN_COUNT = 6;

function setTableMessage(body, message, colspan = STANDARD_COLUMN_COUNT) {
  if (!body) return;
  body.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

function setCellInput(td, name, value, placeholder = '') {
  const input = document.createElement('input');
  input.name = name;
  input.value = value == null ? '' : String(value);
  input.placeholder = placeholder;
  td.appendChild(input);
  return input;
}

function addTextInput(td, name, value, placeholder = '') {
  return setCellInput(td, name, value, placeholder);
}

function addCheckbox(td, name, value, labelText) {
  const label = document.createElement('label');
  label.className = 'crm-inline-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.checked = Boolean(value);
  const span = document.createElement('span');
  span.textContent = labelText;
  label.append(input, span);
  td.appendChild(label);
  return input;
}

function appendQualityCell(td, row, fallback = 'Tamam') {
  const derivedScore = Number(row.health_score || 0);
  const scoreBadge = document.createElement('span');
  scoreBadge.className =
    derivedScore >= 80 ? 'crm-ok' : derivedScore >= 60 ? 'crm-warn' : 'crm-status';
  scoreBadge.textContent = `${derivedScore}/100`;
  td.appendChild(scoreBadge);

  const qualityMeta = document.createElement('small');
  qualityMeta.textContent =
    Array.isArray(row.missing_fields) && row.missing_fields.length
      ? row.missing_fields.join(', ')
      : fallback;
  td.appendChild(qualityMeta);
}

function buildRowPayload(tr, id) {
  const payload = { id };
  tr.querySelectorAll('input').forEach((input) => {
    payload[input.name] = input.type === 'checkbox' ? input.checked : input.value;
  });
  return payload;
}

function createSaveButton(tr, rowId, resource) {
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'crm-row-save';
  save.textContent = 'Kaydet';
  save.addEventListener('click', async () => {
    const payload = buildRowPayload(tr, rowId);
    save.textContent = 'Kaydediliyor...';
    try {
      const res = await fetch(`/api/admin/crm/${resource}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      save.textContent = res.ok && result.data?.success ? 'Kaydedildi' : 'Hata';
    } catch {
      save.textContent = 'Hata';
    }
  });
  return save;
}

function bindSearchControls(root, searchSelector, filterSelector, loadSelector, loadFn) {
  root.querySelectorAll(loadSelector).forEach((button) => {
    button.addEventListener('click', loadFn);
  });
  root.querySelector(searchSelector)?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadFn();
  });
  if (filterSelector) {
    root.querySelector(filterSelector)?.addEventListener('change', loadFn);
  }
}

function createLiveLoader({
  rootSelector,
  bodySelector,
  loadSelector,
  searchSelector,
  filterSelector,
  resourceResolver,
  colspan = STANDARD_COLUMN_COUNT,
  loadingMessage = 'Yükleniyor...',
  errorMessage = 'Veri yüklenemedi.',
  renderRows,
}) {
  document.querySelectorAll(rootSelector).forEach((root) => {
    if (root.dataset.liveBound === 'true') return;
    root.dataset.liveBound = 'true';

    const loadRows = async () => {
      const body = root.querySelector(bodySelector);
      const resource = resourceResolver(root);
      if (!body || !resource) return;
      setTableMessage(body, loadingMessage, colspan);
      const search = root.querySelector(searchSelector)?.value || '';
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('q', search);
      try {
        const res = await fetch(`/api/admin/crm/${resource}?${params.toString()}`);
        const payload = await res.json();
        renderRows(root, resource, payload.data?.items || []);
      } catch {
        setTableMessage(body, errorMessage, colspan);
      }
    };

    bindSearchControls(root, searchSelector, filterSelector, loadSelector, loadRows);
  });
}

function initPlacesCrm() {
  const selectedPlaces = new Set();
  const placeBody = document.getElementById('crm-place-body');
  const placeBulk = document.getElementById('crm-place-bulk');
  const placeSelected = document.getElementById('crm-place-selected');

  const updatePlaceBulk = () => {
    if (!placeBulk || !placeSelected) return;
    placeSelected.textContent = String(selectedPlaces.size);
    placeBulk.hidden = selectedPlaces.size === 0;
  };

  const renderPlaceRows = (rows) => {
    if (!placeBody) return;
    placeBody.replaceChildren();
    if (!rows.length) {
      setTableMessage(placeBody, 'Kayıt bulunamadı.');
      return;
    }
    rows.forEach((place) => {
      const tr = document.createElement('tr');
      const quality = Array.isArray(place.missing_fields) ? place.missing_fields : [];
      const score = Number(place.health_score || 0);
      const scoreClass = score >= 80 ? 'crm-ok' : score >= 60 ? 'crm-warn' : 'crm-status';
      tr.innerHTML = `
        <td><input type="checkbox" data-place-id="${place.id}" ${selectedPlaces.has(place.id) ? 'checked' : ''} /></td>
        <td><strong>${place.name || '-'}</strong><small>${place.slug || ''}</small></td>
        <td>${place.category_name || place.category || '-'}</td>
        <td><span class="crm-status">${place.status || '-'}</span></td>
        <td>
          <span class="${scoreClass}">${score}/100</span>
          ${quality.length ? `<small>${quality.join(', ')}</small>` : '<small>Tamam</small>'}
        </td>
        <td><a href="/admin/places/edit/${place.id}">Düzenle</a> · <a href="/isletme/${place.slug}" target="_blank" rel="noopener">Önizle</a></td>
      `;
      placeBody.appendChild(tr);
    });
    placeBody.querySelectorAll('[data-place-id]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) selectedPlaces.add(input.dataset.placeId);
        else selectedPlaces.delete(input.dataset.placeId);
        updatePlaceBulk();
      });
    });
  };

  const loadPlacesCrm = async () => {
    if (!placeBody) return;
    setTableMessage(placeBody, 'Yükleniyor...');
    const params = new URLSearchParams({ limit: '25' });
    const search = document.getElementById('crm-place-search')?.value || '';
    const status = document.getElementById('crm-place-status')?.value || 'all';
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    try {
      const res = await fetch(`/api/admin/places?${params.toString()}`);
      const payload = await res.json();
      renderPlaceRows(payload.places || []);
    } catch {
      setTableMessage(placeBody, 'Mekan listesi yüklenemedi.');
    }
  };

  document.getElementById('crm-place-load')?.addEventListener('click', loadPlacesCrm);
  document.getElementById('crm-place-search')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadPlacesCrm();
  });
  document.getElementById('crm-place-all')?.addEventListener('change', (event) => {
    document.querySelectorAll('[data-place-id]').forEach((input) => {
      input.checked = event.target.checked;
      if (input.checked) selectedPlaces.add(input.dataset.placeId);
      else selectedPlaces.delete(input.dataset.placeId);
    });
    updatePlaceBulk();
  });
  document.querySelectorAll('[data-place-bulk]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!selectedPlaces.size) return;
      button.textContent = 'İşleniyor...';
      const action = button.getAttribute('data-place-bulk');
      const res = await fetch('/api/admin/places', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ placeIds: Array.from(selectedPlaces), action }),
      });
      button.textContent = res.ok ? 'Tamamlandı' : 'Hata';
      selectedPlaces.clear();
      updatePlaceBulk();
      await loadPlacesCrm();
    });
  });

  if (placeBody) loadPlacesCrm();
}

function renderLocationRows(root, resource, rows) {
  const body = root.querySelector('[data-location-body]');
  const filter = root.querySelector('[data-location-filter]')?.value || 'all';
  if (!body) return;
  body.replaceChildren();
  const visibleRows = rows.filter((row) => {
    if (filter === 'seo-missing') return !(row.meta_title || row.meta_description || row.description);
    if (filter === 'image-missing') return resource === 'districts' ? !row.image : false;
    if (filter === 'coordinate-missing') return !(row.latitude && row.longitude);
    return true;
  });
  if (!visibleRows.length) {
    setTableMessage(body, 'Kayıt bulunamadı.', resource === 'neighborhoods' ? 7 : 6);
    return;
  }
  visibleRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const nameTd = document.createElement('td');
    setCellInput(nameTd, 'name', row.name, 'Ad');
    tr.appendChild(nameTd);

    const slugTd = document.createElement('td');
    setCellInput(slugTd, 'slug', row.slug, 'slug');
    tr.appendChild(slugTd);

    if (resource === 'neighborhoods') {
      const districtTd = document.createElement('td');
      setCellInput(districtTd, 'district_id', row.district_id, 'İlçe ID');
      const hint = document.createElement('small');
      hint.textContent = row.district_name || '';
      districtTd.appendChild(hint);
      tr.appendChild(districtTd);
    }

    const seoTd = document.createElement('td');
    if (resource === 'districts') {
      setCellInput(seoTd, 'meta_title', row.meta_title, 'SEO title');
      setCellInput(seoTd, 'meta_description', row.meta_description, 'SEO description');
    } else {
      setCellInput(seoTd, 'postal_code', row.postal_code, 'Posta kodu');
    }
    tr.appendChild(seoTd);

    const coordTd = document.createElement('td');
    setCellInput(coordTd, 'latitude', row.latitude, 'Enlem');
    setCellInput(coordTd, 'longitude', row.longitude, 'Boylam');
    tr.appendChild(coordTd);

    const countTd = document.createElement('td');
    countTd.textContent = String(row.place_count || 0);
    tr.appendChild(countTd);

    const actionTd = document.createElement('td');
    actionTd.appendChild(createSaveButton(tr, row.id, resource));
    tr.appendChild(actionTd);
    body.appendChild(tr);
  });
}

function renderOpsRows(root, resource, rows) {
  const body = root.querySelector('[data-ops-body]');
  const filter = root.querySelector('[data-ops-filter]')?.value || 'all';
  if (!body) return;
  body.replaceChildren();
  const visibleRows = rows.filter((row) => {
    if (filter === 'draft') return row.status && row.status !== 'active' && row.status !== 'published';
    if (filter === 'upcoming') return row.start_date && new Date(row.start_date) >= new Date();
    if (filter === 'image-missing') return !row.image_url;
    if (filter === 'duty') return row.is_on_duty;
    if (filter === 'phone-missing') return !row.phone;
    if (filter === 'coordinate-missing') return !(row.latitude && row.longitude);
    return true;
  });
  if (!visibleRows.length) {
    setTableMessage(body, 'Kayıt bulunamadı.');
    return;
  }
  visibleRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const nameTd = document.createElement('td');
    addTextInput(
      nameTd,
      resource === 'events' ? 'title' : 'name',
      resource === 'events' ? row.title : row.name,
      'Ad',
    );
    tr.appendChild(nameTd);

    const slugTd = document.createElement('td');
    addTextInput(slugTd, 'slug', row.slug, 'slug');
    tr.appendChild(slugTd);

    const statusTd = document.createElement('td');
    if (resource === 'events') {
      addTextInput(statusTd, 'start_date', row.start_date, 'Başlangıç');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addCheckbox(statusTd, 'is_free', row.is_free, 'Ücretsiz');
    } else {
      addTextInput(statusTd, 'phone', row.phone, 'Telefon');
      addTextInput(statusTd, 'duty_date', row.duty_date, 'Nöbet tarihi');
      addCheckbox(statusTd, 'is_on_duty', row.is_on_duty, 'Nöbetçi');
    }
    tr.appendChild(statusTd);

    const contextTd = document.createElement('td');
    if (resource === 'events') {
      addTextInput(contextTd, 'location', row.location, 'Lokasyon');
      addTextInput(contextTd, 'category', row.category, 'Kategori');
    } else {
      addTextInput(contextTd, 'address', row.address, 'Adres');
      addTextInput(contextTd, 'district_id', row.district_id, 'İlçe ID');
      const hint = document.createElement('small');
      hint.textContent = row.district_name || '';
      contextTd.appendChild(hint);
    }
    tr.appendChild(contextTd);

    const qualityTd = document.createElement('td');
    appendQualityCell(qualityTd, row);
    tr.appendChild(qualityTd);

    const actionTd = document.createElement('td');
    actionTd.appendChild(createSaveButton(tr, row.id, resource));
    tr.appendChild(actionTd);
    body.appendChild(tr);
  });
}

function renderControlRows(root, resource, rows) {
  const body = root.querySelector('[data-control-body]');
  const filter = root.querySelector('[data-control-filter]')?.value || 'all';
  const mode = root.getAttribute('data-control-mode');
  if (!body || !mode) return;
  body.replaceChildren();
  const visibleRows = rows.filter((row) => {
    if (mode === 'reviews') {
      if (filter === 'pending') return row.status === 'pending' || !row.is_moderated;
      if (filter === 'flagged') return row.status === 'flagged';
      if (filter === 'hidden') return row.is_hidden;
    }
    if (mode === 'ads') {
      if (filter === 'active') return row.status === 'active';
      if (filter === 'ending') return row.ended_at && new Date(row.ended_at) <= new Date(Date.now() + 7 * 86400000);
      if (filter === 'budget-missing') return !row.budget;
    }
    if (mode === 'map') {
      if (filter === 'coordinate-missing') return !(row.latitude && row.longitude);
      if (filter === 'district-missing') return !row.district_id;
      if (filter === 'address-missing') return !row.address;
    }
    return true;
  });
  if (!visibleRows.length) {
    setTableMessage(body, 'Kayıt bulunamadı.');
    return;
  }
  visibleRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const primaryTd = document.createElement('td');
    const secondaryTd = document.createElement('td');
    const statusTd = document.createElement('td');
    const detailTd = document.createElement('td');
    const qualityTd = document.createElement('td');
    const actionTd = document.createElement('td');

    if (mode === 'reviews') {
      addTextInput(primaryTd, 'title', row.title, 'Başlık');
      addTextInput(primaryTd, 'rating', row.rating, 'Puan');
      const place = document.createElement('small');
      place.textContent = row.place_name || '';
      secondaryTd.appendChild(place);
      addTextInput(secondaryTd, 'content', row.content, 'Yorum');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addCheckbox(statusTd, 'is_moderated', row.is_moderated, 'Moderate edildi');
      addCheckbox(statusTd, 'is_hidden', row.is_hidden, 'Gizle');
      addCheckbox(statusTd, 'is_verified', row.is_verified, 'Doğrulanmış');
      detailTd.textContent = row.user_name || 'Anonim';
    } else if (mode === 'ads') {
      addTextInput(primaryTd, 'title', row.title, 'Başlık');
      addTextInput(primaryTd, 'ad_type', row.ad_type, 'Alan/tip');
      const place = document.createElement('small');
      place.textContent = row.place_name || '';
      secondaryTd.appendChild(place);
      addTextInput(secondaryTd, 'content', row.content, 'Not/içerik');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addTextInput(statusTd, 'budget', row.budget, 'Bütçe');
      addTextInput(detailTd, 'started_at', row.started_at, 'Başlangıç');
      addTextInput(detailTd, 'ended_at', row.ended_at, 'Bitiş');
    } else {
      addTextInput(primaryTd, 'name', row.name, 'Mekan adı');
      addTextInput(primaryTd, 'slug', row.slug, 'slug');
      addTextInput(secondaryTd, 'address', row.address, 'Adres');
      const district = document.createElement('small');
      district.textContent = row.district_name || '';
      secondaryTd.appendChild(district);
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addTextInput(statusTd, 'district_id', row.district_id, 'İlçe ID');
      addTextInput(detailTd, 'latitude', row.latitude, 'Enlem');
      addTextInput(detailTd, 'longitude', row.longitude, 'Boylam');
    }

    appendQualityCell(qualityTd, row);
    actionTd.appendChild(createSaveButton(tr, row.id, resource));
    tr.append(primaryTd, secondaryTd, statusTd, detailTd, qualityTd, actionTd);
    body.appendChild(tr);
  });
}

function renderSocialRows(root, resource, rows) {
  const body = root.querySelector('[data-social-body]');
  const filter = root.querySelector('[data-social-filter]')?.value || 'all';
  const mode = root.getAttribute('data-social-mode');
  if (!body || !mode) return;
  body.replaceChildren();
  const visibleRows = rows.filter((row) => {
    if (mode === 'community/users') {
      if (filter === 'admin') return row.role === 'admin';
      if (filter === 'suspended') return row.status && row.status !== 'active';
      if (filter === 'reported') return Number(row.report_count || 0) > 0;
    }
    if (mode === 'community/profiles') {
      if (filter === 'discoverable') return row.is_discoverable;
      if (filter === 'incomplete') return Number(row.profile_completeness || 0) < 70;
      if (filter === 'district-missing') return !row.preferred_district;
    }
    if (mode === 'community/reports') {
      if (filter === 'pending') return ['pending', 'under_review', 'open', 'investigating'].includes(row.status);
      if (filter === 'resolved') return ['resolved', 'dismissed'].includes(row.status);
      if (filter === 'message') return row.content_type === 'message';
    }
    if (mode === 'messages') {
      if (filter === 'unread') return row.status === 'unread';
      if (filter === 'open') return !['closed', 'resolved', 'archived'].includes(row.status);
      if (filter === 'email-missing') return !row.email;
    }
    return true;
  });
  if (!visibleRows.length) {
    setTableMessage(body, 'Kayıt bulunamadı.');
    return;
  }
  visibleRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    const primaryTd = document.createElement('td');
    const secondaryTd = document.createElement('td');
    const statusTd = document.createElement('td');
    const detailTd = document.createElement('td');
    const qualityTd = document.createElement('td');
    const actionTd = document.createElement('td');

    if (mode === 'community/users') {
      addTextInput(primaryTd, 'full_name', row.full_name || row.display_name, 'Ad soyad');
      const email = document.createElement('small');
      email.textContent = row.email || '';
      primaryTd.appendChild(email);
      addTextInput(secondaryTd, 'role', row.role, 'Rol');
      addTextInput(secondaryTd, 'subscription_tier', row.subscription_tier, 'Abonelik');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addTextInput(statusTd, 'points', row.points, 'Puan');
      detailTd.textContent = `${row.review_count || 0} yorum · ${row.place_count || 0} mekan`;
    } else if (mode === 'community/profiles') {
      const owner = document.createElement('strong');
      owner.textContent = row.user_name || row.email || row.user_id;
      primaryTd.appendChild(owner);
      const email = document.createElement('small');
      email.textContent = row.email || '';
      primaryTd.appendChild(email);
      addTextInput(secondaryTd, 'bio', row.bio, 'Bio');
      addTextInput(statusTd, 'preferred_district', row.preferred_district, 'İlçe');
      addTextInput(statusTd, 'looking_for', row.looking_for, 'Aradığı');
      addCheckbox(statusTd, 'is_discoverable', row.is_discoverable, 'Keşfedilebilir');
      addTextInput(detailTd, 'age_range_min', row.age_range_min, 'Min yaş');
      addTextInput(detailTd, 'age_range_max', row.age_range_max, 'Max yaş');
      detailTd.append(` · ${row.profile_completeness || 0}/100 tamamlanma`);
    } else if (mode === 'community/reports') {
      const reporter = document.createElement('strong');
      reporter.textContent = row.reporter_name || 'Raporlayan';
      primaryTd.appendChild(reporter);
      const reported = document.createElement('small');
      reported.textContent = row.reported_user_name || '';
      primaryTd.appendChild(reported);
      addTextInput(secondaryTd, 'reason', row.reason, 'Sebep');
      addTextInput(secondaryTd, 'description', row.description, 'Açıklama');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addTextInput(detailTd, 'resolution_note', row.resolution_note, 'Çözüm notu');
      detailTd.append(` · ${row.content_type || '-'} · ${row.resolved_at ? 'çözüldü' : 'açık'}`);
    } else {
      addTextInput(primaryTd, 'subject', row.subject, 'Konu');
      const sender = document.createElement('small');
      sender.textContent = row.sender_name || row.name || row.email || '';
      primaryTd.appendChild(sender);
      addTextInput(secondaryTd, 'body', row.body, 'Mesaj');
      addTextInput(statusTd, 'status', row.status, 'Durum');
      addTextInput(detailTd, 'name', row.name, 'Ad');
      addTextInput(detailTd, 'email', row.email, 'E-posta');
    }

    appendQualityCell(qualityTd, row);
    actionTd.appendChild(createSaveButton(tr, row.id, resource));
    tr.append(primaryTd, secondaryTd, statusTd, detailTd, qualityTd, actionTd);
    body.appendChild(tr);
  });
}

function seoScore(row) {
  let score = 100;
  if (!row.title || String(row.title).length < 20) score -= 20;
  if (!row.meta_title || String(row.meta_title).length < 20) score -= 15;
  if (!row.meta_description || String(row.meta_description).length < 70) score -= 25;
  if (!row.heading || String(row.heading).length < 10) score -= 15;
  if (!row.intro_text || String(row.intro_text).length < 120) score -= 20;
  if (!row.is_active) score -= 5;
  return Math.max(0, score);
}

function renderSeoRows(root, resource, rows) {
  const body = root.querySelector('[data-seo-body]');
  const filter = root.querySelector('[data-seo-filter]')?.value || 'all';
  if (!body) return;
  body.replaceChildren();
  const visibleRows = rows.filter((row) => {
    if (filter === 'missing-title') return !row.title || !row.meta_title || !row.meta_description;
    if (filter === 'missing-intro') return !row.intro_text || String(row.intro_text).length < 120;
    if (filter === 'inactive') return !row.is_active;
    return true;
  });
  if (!visibleRows.length) {
    setTableMessage(body, 'SEO kaydı bulunamadı.');
    return;
  }
  visibleRows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    const urlTd = document.createElement('td');
    const metaTd = document.createElement('td');
    const contentTd = document.createElement('td');
    const scoreTd = document.createElement('td');
    const statusTd = document.createElement('td');
    const actionTd = document.createElement('td');

    addTextInput(urlTd, 'slug', row.slug, 'slug');
    addTextInput(urlTd, 'title', row.title, 'Title');
    addTextInput(metaTd, 'meta_title', row.meta_title, 'Meta title');
    addTextInput(metaTd, 'meta_description', row.meta_description, 'Meta description');
    addTextInput(contentTd, 'heading', row.heading, 'H1');
    addTextInput(contentTd, 'intro_text', row.intro_text, 'Intro metin');

    const score = Number(row.health_score ?? seoScore(row));
    const badge = document.createElement('span');
    badge.className = score >= 80 ? 'crm-ok' : score >= 60 ? 'crm-warn' : 'crm-status';
    badge.textContent = `${score}/100`;
    scoreTd.appendChild(badge);
    const scoreMeta = document.createElement('small');
    scoreMeta.textContent =
      Array.isArray(row.missing_fields) && row.missing_fields.length
        ? row.missing_fields.join(', ')
        : 'SEO alanlari tamam';
    scoreTd.appendChild(scoreMeta);

    addCheckbox(statusTd, 'is_active', row.is_active, 'Aktif/index dahil');
    actionTd.appendChild(createSaveButton(tr, row.id, resource));
    tr.append(urlTd, metaTd, contentTd, scoreTd, statusTd, actionTd);
    body.appendChild(tr);
  });
}

function initMediaCrm() {
  document.getElementById('crm-media-load')?.addEventListener('click', async () => {
    const grid = document.getElementById('crm-media-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="crm-empty"><strong>Yükleniyor...</strong></div>';
    try {
      const res = await fetch('/api/admin/site/media?limit=24');
      const payload = await res.json();
      const items = payload.items || [];
      grid.replaceChildren();
      if (!items.length) {
        grid.innerHTML =
          '<div class="crm-empty"><strong>Medya kaydı yok</strong><p>Local storage modeli hazır; kayıt bulunamadı.</p></div>';
        return;
      }
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'crm-media-card';
        card.innerHTML = `
          <div class="crm-media-thumb">${item.url ? `<img src="${item.url}" alt="${item.alt || ''}" loading="lazy" />` : ''}</div>
          <strong>${item.asset_key || item.assetKey || 'medya'}</strong>
          <span>${item.alt ? 'Alt text var' : 'Alt text eksik'}</span>
        `;
        grid.appendChild(card);
      });
    } catch {
      grid.innerHTML = '<div class="crm-empty"><strong>Medya yüklenemedi</strong></div>';
    }
  });
}

function initBotRunner() {
  document.querySelectorAll('[data-bot-run]').forEach((button) => {
    if (button.dataset.botBound === 'true') return;
    button.dataset.botBound = 'true';
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-bot-run');
      button.textContent = 'Çalışıyor...';
      const resultBox = document.getElementById('crm-bot-result');
      try {
        const res = await fetch('/api/admin/bots/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ botKey: key }),
        });
        const payload = await res.json();
        button.textContent = payload.success ? `${payload.result.suggestions.length} öneri hazır` : 'Hata';
        if (payload.success && resultBox) {
          resultBox.replaceChildren();
          const title = document.createElement('strong');
          title.textContent = `${payload.bot.title} · ${payload.result.status}`;
          const meta = document.createElement('p');
          meta.textContent = `${payload.result.issues} sorun · ${payload.result.suggestions.length} öneri · ${new Date(payload.result.ranAt).toLocaleString('tr-TR')}`;
          const list = document.createElement('ul');
          (payload.result.suggestions || []).forEach((item) => {
            const li = document.createElement('li');
            li.textContent = `${item.title}: ${item.description}`;
            list.appendChild(li);
          });
          resultBox.append(title, meta, list);
        }
      } catch {
        button.textContent = 'Hata';
      }
      button.setAttribute('aria-label', `${key} botu manuel analiz önerisi hazırladı`);
    });
  });
}

export function initCityCrmLive() {
  const page = document.querySelector('[data-city-crm-live]');
  if (!page || page.dataset.cityCrmLiveReady === 'true') return;
  page.dataset.cityCrmLiveReady = 'true';

  initPlacesCrm();
  createLiveLoader({
    rootSelector: '[data-location-crm]',
    bodySelector: '[data-location-body]',
    loadSelector: '[data-location-load]',
    searchSelector: '[data-location-search]',
    filterSelector: '[data-location-filter]',
    resourceResolver: (root) => root.getAttribute('data-location-crm'),
    colspan: 7,
    errorMessage: 'Lokasyon verisi yüklenemedi.',
    renderRows: renderLocationRows,
  });
  createLiveLoader({
    rootSelector: '[data-ops-crm]',
    bodySelector: '[data-ops-body]',
    loadSelector: '[data-ops-load]',
    searchSelector: '[data-ops-search]',
    filterSelector: '[data-ops-filter]',
    resourceResolver: (root) => root.getAttribute('data-ops-crm'),
    errorMessage: 'Veri yüklenemedi.',
    renderRows: renderOpsRows,
  });
  createLiveLoader({
    rootSelector: '[data-control-crm]',
    bodySelector: '[data-control-body]',
    loadSelector: '[data-control-load]',
    searchSelector: '[data-control-search]',
    filterSelector: '[data-control-filter]',
    resourceResolver: (root) => root.getAttribute('data-control-crm'),
    errorMessage: 'Veri yüklenemedi.',
    renderRows: renderControlRows,
  });
  createLiveLoader({
    rootSelector: '[data-social-crm]',
    bodySelector: '[data-social-body]',
    loadSelector: '[data-social-load]',
    searchSelector: '[data-social-search]',
    filterSelector: '[data-social-filter]',
    resourceResolver: (root) => root.getAttribute('data-social-crm'),
    errorMessage: 'Veri yüklenemedi.',
    renderRows: renderSocialRows,
  });
  createLiveLoader({
    rootSelector: '[data-seo-crm]',
    bodySelector: '[data-seo-body]',
    loadSelector: '[data-seo-load]',
    searchSelector: '[data-seo-search]',
    filterSelector: '[data-seo-filter]',
    resourceResolver: (root) => root.getAttribute('data-seo-crm') || 'seo-pages',
    errorMessage: 'SEO kayıtları yüklenemedi.',
    renderRows: renderSeoRows,
  });
  initMediaCrm();
  initBotRunner();
}
