import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractCollectionDetail,
  extractCollectionMessage,
  renderCollectionDetail,
  type CollectionData,
  type CollectionItem,
} from '../lib/collection-detail';

type CollectionRoot = HTMLElement & { dataset: DOMStringMap };

function readCollection(root: CollectionRoot): CollectionData | null {
  const raw = root.dataset.collectionJson;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CollectionData;
  } catch {
    return null;
  }
}

function writeCollection(root: CollectionRoot, collection: CollectionData | null) {
  if (!collection) {
    delete root.dataset.collectionJson;
    return;
  }
  root.dataset.collectionJson = JSON.stringify(collection);
}

function readItems(root: CollectionRoot): CollectionItem[] {
  const raw = root.dataset.collectionItems;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CollectionItem[];
  } catch {
    return [];
  }
}

function writeItems(root: CollectionRoot, items: CollectionItem[]) {
  root.dataset.collectionItems = JSON.stringify(items);
}

function setError(root: CollectionRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function loadCollection(root: CollectionRoot) {
  const collectionId = root.dataset.collectionId;
  if (!collectionId) throw new Error('Collection ID missing');

  const response = await fetch(`/api/collections/${collectionId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Koleksiyon bulunamadı'
        : extractCollectionMessage(payload, 'Koleksiyon yüklenemedi'),
    );
  }

  const detail = extractCollectionDetail(payload);
  if (!detail) {
    throw new Error('Koleksiyon yüklenemedi');
  }

  writeCollection(root, detail.collection);
  writeItems(root, detail.items);
  setError(root, null);
}

async function toggleFollow(root: CollectionRoot) {
  const collectionId = root.dataset.collectionId;
  if (!collectionId) return;

  if (!root.dataset.currentUserId) {
    window.alert('Oturum açmanız gerekiyor');
    return;
  }

  root.dataset.followingLoading = 'true';
  await renderRoot(root);

  try {
    const response = await fetch(`/api/collections/${collectionId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(extractCollectionMessage(payload, 'Takip işlemi başarısız'));
    }

    root.dataset.isFollowing = String(Boolean((payload as { data?: { following?: boolean } }).data?.following));

    const collection = readCollection(root);
    if (collection) {
      const delta = root.dataset.isFollowing === 'true' ? 1 : -1;
      writeCollection(root, {
        ...collection,
        follower_count: Math.max((collection.follower_count || 0) + delta, 0),
      });
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Takip işlemi başarısız');
  } finally {
    delete root.dataset.followingLoading;
    await renderRoot(root);
  }
}

async function removeItem(root: CollectionRoot, placeId: string) {
  const collection = readCollection(root);
  if (!collection || root.dataset.currentUserId !== collection.user_id) {
    return;
  }

  if (!window.confirm('Mekanı koleksiyondan kaldırmak istediğinize emin misiniz?')) {
    return;
  }

  const collectionId = root.dataset.collectionId;
  if (!collectionId) return;

  try {
    const response = await fetch(`/api/collections/${collectionId}/items?placeId=${encodeURIComponent(placeId)}`, {
      method: 'DELETE',
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(extractCollectionMessage(payload, 'Yer kaldırılamadı'));
    }

    const items = readItems(root).filter((item) => item.place_id !== placeId);
    writeItems(root, items);
    writeCollection(root, {
      ...collection,
      place_count: items.length,
    });
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Yer kaldırılamadı');
  } finally {
    await renderRoot(root);
  }
}

function bindActions(root: CollectionRoot, content: HTMLElement) {
  const followButton = content.querySelector<HTMLElement>('[data-collection-follow]');
  if (followButton) {
    followButton.addEventListener('click', () => {
      if (root.dataset.followingLoading === 'true') return;
      void toggleFollow(root);
    });
  }

  const removeButtons = Array.from(content.querySelectorAll<HTMLElement>('[data-collection-remove-item]'));
  for (const button of removeButtons) {
    button.addEventListener('click', () => {
      const placeId = button.dataset.collectionRemoveItem;
      if (!placeId) return;
      void removeItem(root, placeId);
    });
  }
}

async function renderRoot(root: CollectionRoot) {
  const loading = root.querySelector<HTMLElement>('[data-collection-detail-loading]');
  const content = root.querySelector<HTMLElement>('[data-collection-detail-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.collectionJson && !root.dataset.error) {
      await loadCollection(root);
    }

    setElementHtml(
      content,
      renderCollectionDetail({
        collection: readCollection(root),
        items: readItems(root),
        error: root.dataset.error || null,
        currentUserId: root.dataset.currentUserId || undefined,
        isFollowing: root.dataset.isFollowing === 'true',
        isFollowingLoading: root.dataset.followingLoading === 'true',
      }),
    );
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Koleksiyon yüklenirken bir hata oluştu');
    setElementHtml(
      content,
      renderCollectionDetail({
        collection: null,
        items: [],
        error: root.dataset.error || null,
        currentUserId: root.dataset.currentUserId || undefined,
        isFollowing: false,
        isFollowingLoading: false,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initCollectionDetail() {
  const roots = Array.from(document.querySelectorAll<CollectionRoot>('[data-collection-detail]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.isFollowing) root.dataset.isFollowing = 'false';
    void renderRoot(root);
  }
}
