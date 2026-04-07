/**
 * User Onboarding
 * Handles user profile completion and email verification
 */

import { queryOne, update } from './postgres';
import { logger } from './logging';

export interface UserOnboardingStatus {
  userId: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  fullName?: string;
  avatar?: string;
  bio?: string;
  onboardingStep: 'welcome' | 'email_verification' | 'profile_completion' | 'completed';
}

/**
 * Get user onboarding status
 */
export async function getUserOnboardingStatus(userId: string): Promise<UserOnboardingStatus | null> {
  try {
    const user = await queryOne(
      `SELECT id, email_verified, full_name, avatar, bio FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return null;
    }

    const profileCompleted = !!(user.full_name && user.bio);
    let onboardingStep: 'welcome' | 'email_verification' | 'profile_completion' | 'completed' = 'welcome';

    if (!user.email_verified) {
      onboardingStep = 'email_verification';
    } else if (!profileCompleted) {
      onboardingStep = 'profile_completion';
    } else {
      onboardingStep = 'completed';
    }

    return {
      userId: user.id,
      emailVerified: user.email_verified,
      profileCompleted,
      fullName: user.full_name,
      avatar: user.avatar,
      bio: user.bio,
      onboardingStep
    };
  } catch (error) {
    logger.error('Get onboarding status failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: string): Promise<boolean> {
  try {
    const result = await update('users', { id: userId }, {
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (!result) {
      return false;
    }

    logger.info('Email verified', { userId });
    return true;
  } catch (error) {
    logger.error('Verify email failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Complete user profile
 */
export async function completeUserProfile(userId: string, profileData: {
  fullName: string;
  bio: string;
  avatar?: string;
}): Promise<boolean> {
  try {
    const updates: Record<string, any> = {
      full_name: profileData.fullName,
      bio: profileData.bio,
      updated_at: new Date().toISOString()
    };

    if (profileData.avatar) {
      updates.avatar = profileData.avatar;
    }

    const result = await update('users', { id: userId }, updates);

    if (!result) {
      return false;
    }

    logger.info('User profile completed', { userId, fullName: profileData.fullName });
    return true;
  } catch (error) {
    logger.error('Complete profile failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const result = await update('users', { id: userId }, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (!result) {
      return false;
    }

    logger.info('Onboarding completed', { userId });
    return true;
  } catch (error) {
    logger.error('Mark onboarding complete failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  try {
    const status = await getUserOnboardingStatus(userId);

    if (!status) {
      return false;
    }

    return status.onboardingStep !== 'completed';
  } catch (error) {
    logger.error('Needs onboarding check failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get onboarding progress percentage
 */
export async function getOnboardingProgress(userId: string): Promise<number> {
  try {
    const status = await getUserOnboardingStatus(userId);

    if (!status) {
      return 0;
    }

    let progress = 0;
    const steps = [
      { name: 'email_verification', weight: 33 },
      { name: 'profile_completion', weight: 67 },
      { name: 'completed', weight: 100 }
    ];

    for (const step of steps) {
      if (status.onboardingStep === step.name) {
        progress = step.weight;
        break;
      }
    }

    if (status.onboardingStep === 'welcome') {
      progress = 0;
    }

    return progress;
  } catch (error) {
    logger.error('Get onboarding progress failed', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Auto-complete onboarding if all steps done
 */
export async function autoCompleteOnboarding(userId: string): Promise<boolean> {
  try {
    const status = await getUserOnboardingStatus(userId);

    if (!status || status.onboardingStep !== 'completed') {
      return false;
    }

    return markOnboardingComplete(userId);
  } catch (error) {
    logger.error('Auto-complete onboarding failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
