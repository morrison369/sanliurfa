# React Removal Audit
- Generated at: 2026-04-17T01:12:16.131Z
- TSX files: 59
- React hook/lib files: 3
- Runtime React usages: 1
- Can remove @astrojs/react integration: no
- Can remove react/react-dom packages now: no

## Blockers
- 59 adet kalan .tsx dosyasi React import ediyor
- 3 adet kalan hook/lib dosyasi React hook import ediyor
- 1 adet runtime kullanim noktasi hala React entegrasyonuna bagli

## Runtime Usages
- astro.config.mjs

## Remaining TSX Files
- src/components/AccessibleButton.tsx
- src/components/AccountDeletionManager.tsx
- src/components/AccountLinkingPanel.tsx
- src/components/ActivityFeedDisplay.tsx
- src/components/AdvancedAnalyticsDashboard.tsx
- src/components/AdvancedSearchForm.tsx
- src/components/AdvancedSearchPanel.tsx
- src/components/AnalyticsDashboard.tsx
- src/components/BlockingManager.tsx
- src/components/CampaignBuilder.tsx
- src/components/CheckoutButton.tsx
- src/components/CommentThread.tsx
- src/components/CouponValidator.tsx
- src/components/ErrorBoundary.tsx
- src/components/ErrorDisplay.tsx
- src/components/EventCard.tsx
- src/components/EventsList.tsx
- src/components/FileManager.tsx
- src/components/FollowPlaceButton.tsx
- src/components/FollowedPlacesPanel.tsx
- src/components/LoginForm.tsx
- src/components/NotificationsPage.tsx
- src/components/PersonalizedRecommendations.tsx
- src/components/PhotoGallery.tsx
- src/components/PlaceAnalyticsPanel.tsx
- src/components/PlaceBadgesDisplay.tsx
- src/components/PlaceFollowersCount.tsx
- src/components/PlaceVendorDashboard.tsx
- src/components/PlaceVerificationBadge.tsx
- src/components/PointsDisplay.tsx
- src/components/PointsHistory.tsx
- src/components/PremiumFeatureGuard.tsx
- src/components/PromotionCard.tsx
- src/components/PromotionsList.tsx
- src/components/PushNotificationManager.tsx
- src/components/RealtimeNotificationBadge.tsx
- src/components/RecommendedPlaces.tsx
- src/components/ReportModal.tsx
- src/components/ReviewStats.tsx
- src/components/RewardsPanel.tsx
- src/components/RsvpButton.tsx
- src/components/SavedSearchesManager.tsx
- src/components/SearchHistoryViewer.tsx
- src/components/SecurityDashboard.tsx
- src/components/SeoAnalyzer.tsx
- src/components/ShareButton.tsx
- src/components/SocialFeatures.tsx
- src/components/SocialInteractions.tsx
- src/components/TenantManager.tsx
- src/components/TrendingRecommendations.tsx
- src/components/TrendingUsersCarousel.tsx
- src/components/TwoFactorSetup.tsx
- src/components/UserActivityStats.tsx
- src/components/UserProfileCard.tsx
- src/components/UserStatsDashboard.tsx
- src/components/VerificationRequestForm.tsx
- src/components/VisitorChart.tsx
- src/components/WebhookDeliveryLogs.tsx
- src/components/admin/AdminDashboard.tsx

## Remaining Hook Files
- src/hooks/useFeatureAccess.ts
- src/hooks/useQuotaCheck.ts
- src/lib/useApiError.ts
