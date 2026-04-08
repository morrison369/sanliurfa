/**
 * User Profile & Settings Management
 * Manage user profile information, preferences, security settings
 */

import { query, queryOne, queryMany } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';
import { hashPassword } from './auth';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  points: number;
  level: number;
  role: string;
  email_verified: boolean;
  email_verified_at?: string;
  language_preference: string;
  theme_preference: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    in_app: boolean;
    digest: string;
  };
  privacy_settings: {
    profile_public: boolean;
    show_email: boolean;
    allow_messages: boolean;
  };
  two_factor_enabled: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user profile with all settings
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const cacheKey = `sanliurfa:user:profile:${userId}`;

  try {
    const cached = await getCache<UserProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await queryOne(
      `SELECT
        id, email, full_name, username, avatar_url, bio, points, level, role,
        email_verified, email_verified_at, language_preference, theme_preference,
        notification_preferences, privacy_settings, two_factor_enabled,
        last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!result) {
      return null;
    }

    const profile: UserProfile = {
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      username: result.username,
      avatar_url: result.avatar_url,
      bio: result.bio,
      points: result.points,
      level: result.level,
      role: result.role,
      email_verified: result.email_verified,
      email_verified_at: result.email_verified_at,
      language_preference: result.language_preference,
      theme_preference: result.theme_preference,
      notification_preferences: result.notification_preferences || {
        email: true,
        push: true,
        in_app: true,
        digest: 'weekly'
      },
      privacy_settings: result.privacy_settings || {
        profile_public: true,
        show_email: false,
        allow_messages: true
      },
      two_factor_enabled: result.two_factor_enabled,
      last_login_at: result.last_login_at,
      created_at: result.created_at,
      updated_at: result.updated_at
    };

    // Cache for 5 minutes
    await setCache(cacheKey, profile, 300);

    return profile;
  } catch (error) {
    logger.error('Failed to get user profile', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Update user profile (bio, avatar, username)
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    bio?: string;
  }
): Promise<UserProfile> {
  try {
    // Validate username uniqueness if updating
    if (updates.username) {
      const existing = await queryOne(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [updates.username, userId]
      );
      if (existing) {
        throw new Error('Username already taken');
      }
    }

    // Build update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.full_name !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(updates.full_name);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatar_url);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(updates.bio);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    if (fields.length === 1) {
      throw new Error('No fields to update');
    }

    const query_str = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await queryOne(query_str, values);

    // Clear cache
    await deleteCache(`sanliurfa:user:profile:${userId}`);

    logger.info('User profile updated', { userId, fields: Object.keys(updates) });

    return {
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      username: result.username,
      avatar_url: result.avatar_url,
      bio: result.bio,
      points: result.points,
      level: result.level,
      role: result.role,
      email_verified: result.email_verified,
      email_verified_at: result.email_verified_at,
      language_preference: result.language_preference,
      theme_preference: result.theme_preference,
      notification_preferences: result.notification_preferences,
      privacy_settings: result.privacy_settings,
      two_factor_enabled: result.two_factor_enabled,
      last_login_at: result.last_login_at,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to update user profile', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Update user settings (language, theme, preferences)
 */
export async function updateUserSettings(
  userId: string,
  updates: {
    language_preference?: string;
    theme_preference?: string;
    notification_preferences?: {
      email?: boolean;
      push?: boolean;
      in_app?: boolean;
      digest?: string;
    };
    privacy_settings?: {
      profile_public?: boolean;
      show_email?: boolean;
      allow_messages?: boolean;
    };
  }
): Promise<UserProfile> {
  try {
    // Get current settings
    const currentUser = await queryOne('SELECT notification_preferences, privacy_settings FROM users WHERE id = $1', [userId]);

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Merge notification preferences
    const newNotifPrefs = {
      ...currentUser.notification_preferences,
      ...updates.notification_preferences
    };

    // Merge privacy settings
    const newPrivacySettings = {
      ...currentUser.privacy_settings,
      ...updates.privacy_settings
    };

    // Build update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.language_preference !== undefined) {
      fields.push(`language_preference = $${paramIndex++}`);
      values.push(updates.language_preference);
    }

    if (updates.theme_preference !== undefined) {
      fields.push(`theme_preference = $${paramIndex++}`);
      values.push(updates.theme_preference);
    }

    if (updates.notification_preferences !== undefined) {
      fields.push(`notification_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(newNotifPrefs));
    }

    if (updates.privacy_settings !== undefined) {
      fields.push(`privacy_settings = $${paramIndex++}`);
      values.push(JSON.stringify(newPrivacySettings));
    }

    if (fields.length === 0) {
      throw new Error('No settings to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query_str = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await queryOne(query_str, values);

    // Clear cache
    await deleteCache(`sanliurfa:user:profile:${userId}`);

    logger.info('User settings updated', { userId, fields: Object.keys(updates) });

    return {
      id: result.id,
      email: result.email,
      full_name: result.full_name,
      username: result.username,
      avatar_url: result.avatar_url,
      bio: result.bio,
      points: result.points,
      level: result.level,
      role: result.role,
      email_verified: result.email_verified,
      email_verified_at: result.email_verified_at,
      language_preference: result.language_preference,
      theme_preference: result.theme_preference,
      notification_preferences: result.notification_preferences,
      privacy_settings: result.privacy_settings,
      two_factor_enabled: result.two_factor_enabled,
      last_login_at: result.last_login_at,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    logger.error('Failed to update user settings', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Change user password
 */
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const passwordHash = await hashPassword(newPassword);

    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    if ((result.rowCount || 0) > 0) {
      // Clear cache
      await deleteCache(`sanliurfa:user:profile:${userId}`);
      logger.info('User password changed', { userId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to change password', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    email?: boolean;
    push?: boolean;
    in_app?: boolean;
    digest?: 'never' | 'daily' | 'weekly' | 'monthly';
  }
): Promise<boolean> {
  try {
    const currentUser = await queryOne('SELECT notification_preferences FROM users WHERE id = $1', [userId]);

    if (!currentUser) {
      throw new Error('User not found');
    }

    const merged = {
      ...currentUser.notification_preferences,
      ...preferences
    };

    const result = await query(
      'UPDATE users SET notification_preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(merged), userId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(`sanliurfa:user:profile:${userId}`);
      logger.info('Notification preferences updated', { userId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to update notification preferences', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  userId: string,
  settings: {
    profile_public?: boolean;
    show_email?: boolean;
    allow_messages?: boolean;
  }
): Promise<boolean> {
  try {
    const currentUser = await queryOne('SELECT privacy_settings FROM users WHERE id = $1', [userId]);

    if (!currentUser) {
      throw new Error('User not found');
    }

    const merged = {
      ...currentUser.privacy_settings,
      ...settings
    };

    const result = await query(
      'UPDATE users SET privacy_settings = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(merged), userId]
    );

    if ((result.rowCount || 0) > 0) {
      await deleteCache(`sanliurfa:user:profile:${userId}`);
      logger.info('Privacy settings updated', { userId });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to update privacy settings', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Record last login time
 */
export async function recordLastLogin(userId: string): Promise<void> {
  try {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
    await deleteCache(`sanliurfa:user:profile:${userId}`);
  } catch (error) {
    logger.error('Failed to record last login', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    // Don't throw - this is non-critical
  }
}
