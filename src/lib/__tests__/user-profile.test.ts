import { describe, expect, it } from 'vitest';
import {
  extractActivityItems,
  extractUserProfile,
  renderUserProfile,
  type ActivityItem,
  type UserProfileData,
} from '../user-profile';

const sampleUser: UserProfileData = {
  id: 'u1',
  email: 'test@example.com',
  full_name: 'Test Kullanıcı',
  role: 'user',
  created_at: '2026-04-17T00:00:00.000Z',
};

const sampleActivity: ActivityItem[] = [
  {
    id: 1,
    userId: 'u1',
    actionType: 'review_created',
    metadata: { placeName: 'Göbeklitepe' },
    createdAt: '2026-04-17T10:00:00.000Z',
  },
];

describe('user-profile helpers', () => {
  it('extracts nested profile and activity payloads', () => {
    expect(extractUserProfile({ data: { success: true, data: sampleUser } })).toEqual(sampleUser);
    expect(extractActivityItems({ data: { success: true, data: sampleActivity } })).toEqual(sampleActivity);
  });

  it('renders profile and activity tabs', () => {
    const profileHtml = renderUserProfile({
      user: sampleUser,
      activity: [],
      activeTab: 'profile',
      error: null,
      saving: false,
      message: 'Kaydedildi',
    });
    const activityHtml = renderUserProfile({
      user: sampleUser,
      activity: sampleActivity,
      activeTab: 'activity',
      error: null,
      saving: false,
      message: null,
    });

    expect(profileHtml).toContain('Profilim');
    expect(profileHtml).toContain('Değişiklikleri kaydet');
    expect(activityHtml).toContain('Göbeklitepe');
    expect(activityHtml).toContain('yorum yaptı');
  });
});
