// analytics module - consolidated

export * from './analytics';
export * from './analytics-reporting';
export * from './behavioral-analytics';
export * from './business-analytics';
export * from './cohort-analytics';
export * from './funnel-analytics';
export * from './google-analytics';
export * from './journey-analytics';
export * from './revenue-intelligence';
export * from './supply-chain-analytics';

// Re-export reporting functions for backward compatibility
export {
  generateUserReport,
  generatePlacesReport,
  generateReviewsReport,
  generateRevenueReport,
  generateEngagementReport,
  reportToCSV,
  reportToJSON,
  getSummaryStats,
} from '../reporting/reporting';

