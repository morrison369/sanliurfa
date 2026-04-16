import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createEmptyFeaturedListingFormData,
  extractFeaturedListingMessage,
  extractFeaturedListings,
  renderFeaturedListingsManager,
  type FeaturedListing,
  type FeaturedListingFormData,
} from '../lib/featured-listings-manager';

type FeaturedListingsRoot = HTMLElement & { dataset: DOMStringMap };

function readListings(root: FeaturedListingsRoot): FeaturedListing[] {
  const raw = root.dataset.listings;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as FeaturedListing[];
  } catch {
    return [];
  }
}

function writeListings(root: FeaturedListingsRoot, listings: FeaturedListing[]) {
  root.dataset.listings = JSON.stringify(listings);
}

function readForm(root: FeaturedListingsRoot): FeaturedListingFormData {
  const raw = root.dataset.form;
  if (!raw) return createEmptyFeaturedListingFormData(root.dataset.placeId || '');

  try {
    return JSON.parse(raw) as FeaturedListingFormData;
  } catch {
    return createEmptyFeaturedListingFormData(root.dataset.placeId || '');
  }
}

function writeForm(root: FeaturedListingsRoot, form: FeaturedListingFormData) {
  root.dataset.form = JSON.stringify(form);
}

function setError(root: FeaturedListingsRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function fetchListings(root: FeaturedListingsRoot) {
  const response = await fetch('/api/featured-listings?my=true');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractFeaturedListingMessage(payload, 'Yeminli listeler alınamadı'));
  }

  writeListings(root, extractFeaturedListings(payload));
  setError(root, null);
}

async function createListing(root: FeaturedListingsRoot, form: FeaturedListingFormData) {
  const response = await fetch('/api/featured-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractFeaturedListingMessage(payload, 'Yeminli liste oluşturulamadı'));
  }
}

async function deleteListing(root: FeaturedListingsRoot, listingId: string) {
  const response = await fetch(`/api/featured-listings/${listingId}`, { method: 'DELETE' });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractFeaturedListingMessage(payload, 'Yeminli liste silinemedi'));
  }

  writeListings(
    root,
    readListings(root).filter((listing) => listing.id !== listingId),
  );
}

function collectFormData(formElement: HTMLFormElement, placeId: string): FeaturedListingFormData {
  const formData = new FormData(formElement);
  return {
    place_id: placeId,
    title: String(formData.get('title') || ''),
    position_tier: String(formData.get('position_tier') || 'standard'),
    start_date: String(formData.get('start_date') || ''),
    end_date: String(formData.get('end_date') || ''),
    cost_per_day: Number(formData.get('cost_per_day') || 0),
    description: String(formData.get('description') || ''),
  };
}

function bindInteractions(root: FeaturedListingsRoot, content: HTMLElement) {
  const toggle = content.querySelector<HTMLElement>('[data-featured-listings-toggle]');
  toggle?.addEventListener('click', async () => {
    root.dataset.showForm = root.dataset.showForm === 'true' ? 'false' : 'true';
    await renderRoot(root);
  });

  const cancel = content.querySelector<HTMLElement>('[data-featured-listings-cancel]');
  cancel?.addEventListener('click', async () => {
    root.dataset.showForm = 'false';
    writeForm(root, createEmptyFeaturedListingFormData(root.dataset.placeId || ''));
    await renderRoot(root);
  });

  const form = content.querySelector<HTMLFormElement>('[data-featured-listing-form]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextForm = collectFormData(form, root.dataset.placeId || '');
    writeForm(root, nextForm);

    try {
      await createListing(root, nextForm);
      root.dataset.showForm = 'false';
      writeForm(root, createEmptyFeaturedListingFormData(root.dataset.placeId || ''));
      await fetchListings(root);
    } catch (error) {
      setError(root, error instanceof Error ? error.message : 'Yeminli liste oluşturulamadı');
    }

    await renderRoot(root);
  });

  const deleteButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-featured-listing-delete]'));
  for (const button of deleteButtons) {
    button.addEventListener('click', async () => {
      const listingId = button.dataset.featuredListingDelete;
      if (!listingId) return;

      try {
        await deleteListing(root, listingId);
        setError(root, null);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'Yeminli liste silinemedi');
      }

      await renderRoot(root);
    });
  }
}

async function renderRoot(root: FeaturedListingsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-featured-listings-loading]');
  const content = root.querySelector<HTMLElement>('[data-featured-listings-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.listings && !root.dataset.error) {
      await fetchListings(root);
    }

    setElementHtml(
      content,
      renderFeaturedListingsManager({
        listings: readListings(root),
        loading: false,
        error: root.dataset.error || null,
        showForm: root.dataset.showForm === 'true',
        form: readForm(root),
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Yeminli listeler alınamadı');
    setElementHtml(
      content,
      renderFeaturedListingsManager({
        listings: [],
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

export function initFeaturedListingsManager() {
  const roots = Array.from(document.querySelectorAll<FeaturedListingsRoot>('[data-featured-listings-manager]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.showForm) root.dataset.showForm = 'false';
    if (!root.dataset.form) writeForm(root, createEmptyFeaturedListingFormData(root.dataset.placeId || ''));
    void renderRoot(root);
  }
}
