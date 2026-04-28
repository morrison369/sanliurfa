// vendor module - consolidated

export * from './payout-engine';
export * from './reverse-logistics';
export * from './vendor';
export * from './vendor-analytics';
export * from './vendor-management';
// vendor-onboarding re-exports selectively to avoid VendorProfile conflict
export type { VendorOnboardingStep } from './vendor-onboarding';
export {
  createVendorProfile,
  getVendorProfileByUserId,
  updateVendorProfile,
  saveOnboardingProgress,
  getOnboardingProgress,
  completeOnboarding,
  getPendingVerifications,
  approveVendor,
  rejectVendor,
} from './vendor-onboarding';

