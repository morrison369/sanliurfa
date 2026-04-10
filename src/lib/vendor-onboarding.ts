/**
 * Vendor Onboarding
 * Handles vendor registration and setup process
 */

import { query, queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

export interface VendorProfile {
  vendorId: string;
  userId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  businessCategory: string;
  businessType: string;
  description?: string;
  logo?: string;
  banner?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface VendorOnboardingStep {
  step: number;
  name: string;
  completed: boolean;
  data: Record<string, any>;
}

const ONBOARDING_STEP_NAMES: Record<number, string> = {
  1: 'business-profile',
  2: 'contact-details',
  3: 'location',
  4: 'branding',
  5: 'verification'
};

function mapVendorProfileRow(result: any): VendorProfile {
  return {
    vendorId: result.id,
    userId: result.user_id,
    businessName: result.business_name,
    businessPhone: result.business_phone,
    businessEmail: result.business_email,
    businessWebsite: result.business_website,
    address: result.address,
    city: result.city,
    district: result.district,
    latitude: result.latitude,
    longitude: result.longitude,
    businessCategory: result.business_category,
    businessType: result.business_type,
    description: result.description,
    logo: result.logo,
    banner: result.banner,
    isVerified: result.is_verified,
    verificationStatus: result.verification_status,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  };
}

/**
 * Create vendor profile during onboarding
 */
export async function createVendorProfile(userId: string, profile: Partial<VendorProfile>): Promise<VendorProfile | null> {
  try {
    const result = await insert('vendor_profiles', {
      user_id: userId,
      business_name: profile.businessName,
      business_phone: profile.businessPhone,
      business_email: profile.businessEmail || null,
      business_website: profile.businessWebsite || null,
      address: profile.address,
      city: profile.city,
      district: profile.district,
      latitude: profile.latitude,
      longitude: profile.longitude,
      business_category: profile.businessCategory,
      business_type: profile.businessType,
      description: profile.description || null,
      logo: profile.logo || null,
      banner: profile.banner || null,
      is_verified: false,
      verification_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (!result) {
      return null;
    }

    logger.info('Vendor profile created', { userId, businessName: profile.businessName });

    return mapVendorProfileRow(result);
  } catch (error) {
    logger.error('Create vendor profile failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get vendor profile by user ID
 */
export async function getVendorProfileByUserId(userId: string): Promise<VendorProfile | null> {
  try {
    const result = await queryOne('SELECT * FROM vendor_profiles WHERE user_id = $1', [userId]);

    if (!result) {
      return null;
    }

    return mapVendorProfileRow(result);
  } catch (error) {
    logger.error('Get vendor profile failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Update vendor profile
 */
export async function updateVendorProfile(vendorId: string, updates: Partial<VendorProfile>): Promise<VendorProfile | null> {
  try {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.businessName) dbUpdates.business_name = updates.businessName;
    if (updates.businessPhone) dbUpdates.business_phone = updates.businessPhone;
    if (updates.businessEmail) dbUpdates.business_email = updates.businessEmail;
    if (updates.businessWebsite) dbUpdates.business_website = updates.businessWebsite;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.city) dbUpdates.city = updates.city;
    if (updates.district) dbUpdates.district = updates.district;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.businessCategory) dbUpdates.business_category = updates.businessCategory;
    if (updates.businessType) dbUpdates.business_type = updates.businessType;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.banner !== undefined) dbUpdates.banner = updates.banner;

    const result = await update('vendor_profiles', { id: vendorId }, dbUpdates);

    if (!result) {
      return null;
    }

    logger.info('Vendor profile updated', { vendorId });

    return mapVendorProfileRow(result);
  } catch (error) {
    logger.error('Update vendor profile failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Save onboarding step progress
 */
export async function saveOnboardingProgress(userId: string, step: number, data: Record<string, any>): Promise<boolean> {
  try {
    const query = `
      INSERT INTO onboarding_progress (user_id, step, data, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id, step) DO UPDATE
      SET data = $3, updated_at = NOW()
    `;

    await queryOne(query, [userId, step, JSON.stringify(data)]);

    logger.info('Onboarding progress saved', { userId, step });
    return true;
  } catch (error) {
    logger.error('Save onboarding progress failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get onboarding progress
 */
export async function getOnboardingProgress(userId: string): Promise<VendorOnboardingStep[]> {
  try {
    const results = await queryMany(
      'SELECT step, data FROM onboarding_progress WHERE user_id = $1 ORDER BY step ASC',
      [userId]
    );

    return results.map((r: any) => ({
      step: r.step,
      name: ONBOARDING_STEP_NAMES[r.step] || `step-${r.step}`,
      completed: !!r.data,
      data: r.data ? JSON.parse(r.data) : {}
    }));
  } catch (error) {
    logger.error('Get onboarding progress failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  try {
    const sql = `
      UPDATE users
      SET vendor_onboarded = true, updated_at = NOW()
      WHERE id = $1
    `;

    const result = await query(sql, [userId]);
    if ((result.rowCount || 0) === 0) {
      return false;
    }

    logger.info('Vendor onboarding completed', { userId });
    return true;
  } catch (error) {
    logger.error('Complete onboarding failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Check if user is a vendor
 */
export async function isVendor(userId: string): Promise<boolean> {
  try {
    const vendor = await getVendorProfileByUserId(userId);
    return !!vendor;
  } catch (error) {
    logger.error('Is vendor check failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get pending vendor verifications (admin only)
 */
export async function getPendingVerifications(limit: number = 10): Promise<VendorProfile[]> {
  try {
    const results = await queryMany(
      'SELECT * FROM vendor_profiles WHERE verification_status = $1 ORDER BY created_at ASC LIMIT $2',
      ['pending', limit]
    );

    return results.map((r: any) => mapVendorProfileRow(r));
  } catch (error) {
    logger.error('Get pending verifications failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Approve vendor verification
 */
export async function approveVendor(vendorId: string): Promise<boolean> {
  try {
    const result = await update('vendor_profiles', { id: vendorId }, {
      verification_status: 'approved',
      is_verified: true,
      updated_at: new Date().toISOString()
    });

    if (!result) {
      return false;
    }

    logger.info('Vendor approved', { vendorId });
    return true;
  } catch (error) {
    logger.error('Approve vendor failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Reject vendor verification
 */
export async function rejectVendor(vendorId: string, reason: string): Promise<boolean> {
  try {
    const result = await update('vendor_profiles', { id: vendorId }, {
      verification_status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString()
    });

    if (!result) {
      return false;
    }

    logger.info('Vendor rejected', { vendorId, reason });
    return true;
  } catch (error) {
    logger.error('Reject vendor failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
