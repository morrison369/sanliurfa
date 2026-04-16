import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createEmptyCampaignFormData,
  extractMarketingCampaignMessage,
  extractMarketingCampaigns,
  renderMarketingCampaignBuilder,
  type Campaign,
  type CampaignFormData,
} from '../lib/marketing-campaign-builder';

type MarketingCampaignRoot = HTMLElement & { dataset: DOMStringMap };

function readCampaigns(root: MarketingCampaignRoot): Campaign[] {
  const raw = root.dataset.campaigns;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Campaign[];
  } catch {
    return [];
  }
}

function writeCampaigns(root: MarketingCampaignRoot, campaigns: Campaign[]) {
  root.dataset.campaigns = JSON.stringify(campaigns);
}

function readForm(root: MarketingCampaignRoot): CampaignFormData {
  const raw = root.dataset.form;
  if (!raw) return createEmptyCampaignFormData(root.dataset.placeId || '');

  try {
    return JSON.parse(raw) as CampaignFormData;
  } catch {
    return createEmptyCampaignFormData(root.dataset.placeId || '');
  }
}

function writeForm(root: MarketingCampaignRoot, form: CampaignFormData) {
  root.dataset.form = JSON.stringify(form);
}

function setError(root: MarketingCampaignRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchCampaigns(root: MarketingCampaignRoot) {
  const response = await fetch('/api/marketing-campaigns');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractMarketingCampaignMessage(payload, 'Kampanyalar alınamadı'));
  }

  writeCampaigns(root, extractMarketingCampaigns(payload));
  setError(root, null);
}

async function createCampaign(form: CampaignFormData) {
  const response = await fetch('/api/marketing-campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractMarketingCampaignMessage(payload, 'Kampanya oluşturulamadı'));
  }
}

async function updateCampaignStatus(campaignId: string, action: 'publish' | 'pause') {
  const response = await fetch(`/api/marketing-campaigns/${campaignId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractMarketingCampaignMessage(payload, 'Kampanya güncellenemedi'));
  }
}

async function deleteCampaign(campaignId: string) {
  const response = await fetch(`/api/marketing-campaigns/${campaignId}`, {
    method: 'DELETE',
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractMarketingCampaignMessage(payload, 'Kampanya silinemedi'));
  }
}

function collectFormData(formElement: HTMLFormElement, placeId: string): CampaignFormData {
  const formData = new FormData(formElement);
  return {
    place_id: placeId,
    name: String(formData.get('name') || ''),
    description: String(formData.get('description') || ''),
    campaign_type: String(formData.get('campaign_type') || 'promotion'),
    budget: Number(formData.get('budget') || 0),
    targeting: {},
    creative_content: {},
  };
}

function bindInteractions(root: MarketingCampaignRoot, content: HTMLElement) {
  const toggle = content.querySelector<HTMLElement>('[data-marketing-campaign-toggle]');
  toggle?.addEventListener('click', async () => {
    root.dataset.showForm = root.dataset.showForm === 'true' ? 'false' : 'true';
    await renderRoot(root);
  });

  const cancel = content.querySelector<HTMLElement>('[data-marketing-campaign-cancel]');
  cancel?.addEventListener('click', async () => {
    root.dataset.showForm = 'false';
    writeForm(root, createEmptyCampaignFormData(root.dataset.placeId || ''));
    await renderRoot(root);
  });

  const form = content.querySelector<HTMLFormElement>('[data-marketing-campaign-form]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextForm = collectFormData(form, root.dataset.placeId || '');
    writeForm(root, nextForm);

    try {
      await createCampaign(nextForm);
      root.dataset.showForm = 'false';
      writeForm(root, createEmptyCampaignFormData(root.dataset.placeId || ''));
      await fetchCampaigns(root);
    } catch (error) {
      setError(root, error instanceof Error ? error.message : 'Kampanya oluşturulamadı');
    }

    await renderRoot(root);
  });

  const actionButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-marketing-campaign-action]'));
  for (const button of actionButtons) {
    button.addEventListener('click', async () => {
      const raw = button.dataset.marketingCampaignAction;
      if (!raw) return;
      const [action, campaignId] = raw.split(':');
      if (!campaignId || (action !== 'publish' && action !== 'pause')) return;

      try {
        await updateCampaignStatus(campaignId, action);
        await fetchCampaigns(root);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'Kampanya güncellenemedi');
      }

      await renderRoot(root);
    });
  }

  const deleteButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-marketing-campaign-delete]'));
  for (const button of deleteButtons) {
    button.addEventListener('click', async () => {
      const campaignId = button.dataset.marketingCampaignDelete;
      if (!campaignId) return;

      try {
        await deleteCampaign(campaignId);
        await fetchCampaigns(root);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'Kampanya silinemedi');
      }

      await renderRoot(root);
    });
  }
}

async function renderRoot(root: MarketingCampaignRoot) {
  const loading = root.querySelector<HTMLElement>('[data-marketing-campaign-loading]');
  const content = root.querySelector<HTMLElement>('[data-marketing-campaign-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.campaigns && !root.dataset.error) {
      await fetchCampaigns(root);
    }

    setElementHtml(
      content,
      renderMarketingCampaignBuilder({
        campaigns: readCampaigns(root),
        loading: false,
        error: root.dataset.error || null,
        showForm: root.dataset.showForm === 'true',
        form: readForm(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Kampanyalar alınamadı');
    setElementHtml(
      content,
      renderMarketingCampaignBuilder({
        campaigns: [],
        loading: false,
        error: root.dataset.error || null,
        showForm: false,
        form: readForm(root),
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initMarketingCampaignBuilder() {
  const roots = Array.from(document.querySelectorAll<MarketingCampaignRoot>('[data-marketing-campaign-builder]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.showForm) root.dataset.showForm = 'false';
    if (!root.dataset.form) writeForm(root, createEmptyCampaignFormData(root.dataset.placeId || ''));
    void renderRoot(root);
  }
}
