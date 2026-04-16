import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractActivityItems,
  extractProfileMessage,
  extractUserProfile,
  renderUserProfile,
  type ActivityItem,
  type UserProfileData,
  type UserProfileTab,
} from '../lib/user-profile';

type UserProfileRoot = HTMLElement & { dataset: DOMStringMap };

function readUser(root: UserProfileRoot): UserProfileData | null {
  const raw = root.dataset.userProfile;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProfileData;
  } catch {
    return null;
  }
}

function writeUser(root: UserProfileRoot, user: UserProfileData | null) {
  if (!user) {
    delete root.dataset.userProfile;
    return;
  }

  root.dataset.userProfile = JSON.stringify(user);
}

function readActivity(root: UserProfileRoot): ActivityItem[] {
  const raw = root.dataset.userActivity;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ActivityItem[];
  } catch {
    return [];
  }
}

function writeActivity(root: UserProfileRoot, items: ActivityItem[]) {
  root.dataset.userActivity = JSON.stringify(items);
}

function readActiveTab(root: UserProfileRoot): UserProfileTab {
  const raw = root.dataset.activeTab;
  return raw === 'favorites' || raw === 'activity' || raw === 'settings' || raw === 'security'
    ? raw
    : 'profile';
}

function setError(root: UserProfileRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

function setMessage(root: UserProfileRoot, message: string | null) {
  if (message) {
    root.dataset.message = message;
  } else {
    delete root.dataset.message;
  }
}

async function fetchUser(root: UserProfileRoot) {
  const response = await fetch('/api/users/profile');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractProfileMessage(payload, 'Profil bilgileri alınamadı'));
  }

  const user = extractUserProfile(payload);
  if (!user) {
    throw new Error('Profil bilgileri alınamadı');
  }

  writeUser(root, user);
  setError(root, null);
}

async function fetchActivity(root: UserProfileRoot) {
  const response = await fetch('/api/activity');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractProfileMessage(payload, 'Aktivite bilgileri alınamadı'));
  }

  writeActivity(root, extractActivityItems(payload));
}

async function saveProfile(root: UserProfileRoot, fullName: string) {
  root.dataset.saving = 'true';
  await renderRoot(root);

  try {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(extractProfileMessage(payload, 'Profil güncellenemedi'));
    }

    const user = extractUserProfile(payload);
    if (user) {
      writeUser(root, user);
    }
    setMessage(root, extractProfileMessage(payload, 'Profil güncellendi'));
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Profil güncellenemedi');
  } finally {
    delete root.dataset.saving;
    await renderRoot(root);
  }
}

function bindActions(root: UserProfileRoot, content: HTMLElement) {
  const tabs = Array.from(content.querySelectorAll<HTMLElement>('[data-user-profile-tab]'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const next = tab.dataset.userProfileTab;
      if (next !== 'profile' && next !== 'favorites' && next !== 'activity' && next !== 'settings' && next !== 'security') {
        return;
      }
      root.dataset.activeTab = next;
      setMessage(root, null);
      void renderRoot(root);
    });
  }

  const saveButton = content.querySelector<HTMLElement>('[data-user-profile-save]');
  const fullNameInput = content.querySelector<HTMLInputElement>('[data-user-profile-full-name]');
  if (saveButton && fullNameInput) {
    saveButton.addEventListener('click', () => {
      void saveProfile(root, fullNameInput.value.trim());
    });
  }
}

async function renderRoot(root: UserProfileRoot) {
  const loading = root.querySelector<HTMLElement>('[data-user-profile-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-profile-content]');
  if (!loading || !content) return;

  try {
    if (!root.dataset.userProfile && !root.dataset.error) {
      await fetchUser(root);
    }

    if (readActiveTab(root) === 'activity' && !root.dataset.userActivity) {
      await fetchActivity(root);
    }

    setElementHtml(
      content,
      renderUserProfile({
        user: readUser(root),
        activity: readActivity(root),
        activeTab: readActiveTab(root),
        error: root.dataset.error || null,
        saving: root.dataset.saving === 'true',
        message: root.dataset.message || null,
      }),
    );
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Profil bilgileri alınamadı');
    setElementHtml(
      content,
      renderUserProfile({
        user: null,
        activity: [],
        activeTab: 'profile',
        error: root.dataset.error || null,
        saving: false,
        message: null,
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initUserProfile() {
  const roots = Array.from(document.querySelectorAll<UserProfileRoot>('[data-user-profile]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    if (!root.dataset.activeTab) root.dataset.activeTab = 'profile';
    void renderRoot(root);
  }
}
