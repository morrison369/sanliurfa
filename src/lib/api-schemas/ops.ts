export const healthStatusSchema = {
  type: 'string',
  enum: ['healthy', 'degraded', 'blocked'],
};

export const artifactHealthEntrySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    status: healthStatusSchema,
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['available', 'status', 'generatedAt'],
};

export const artifactHealthChecksSchema = {
  type: 'object',
  properties: {
    releaseGate: artifactHealthEntrySchema,
    nightlyRegression: artifactHealthEntrySchema,
    nightlyE2E: artifactHealthEntrySchema,
  },
  required: ['releaseGate', 'nightlyRegression', 'nightlyE2E'],
};

export const adminArtifactHealthSnapshotSchema = {
  type: 'object',
  properties: {
    releaseGate: artifactHealthEntrySchema,
    nightlyRegression: artifactHealthEntrySchema,
    nightlyE2E: artifactHealthEntrySchema,
    performanceOps: artifactHealthEntrySchema,
    adminAccessCoverage: artifactHealthEntrySchema,
  },
  required: ['releaseGate', 'nightlyRegression', 'nightlyE2E', 'performanceOps', 'adminAccessCoverage'],
};

export const adminArtifactHealthSummarySchema = {
  type: 'object',
  properties: {
    overall: healthStatusSchema,
    healthyCount: { type: 'integer' },
    degradedCount: { type: 'integer' },
    blockedCount: { type: 'integer' },
    total: { type: 'integer' },
  },
  required: ['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total'],
};

export const integrationSummarySchema = {
  type: 'object',
  properties: {
    configuredCount: { type: 'integer' },
    total: { type: 'integer' },
    fullyConfigured: { type: 'boolean' },
  },
  required: ['configuredCount', 'total', 'fullyConfigured'],
};

export const integrationVerificationSchema = {
  type: 'object',
  properties: {
    resend: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['status', 'message', 'checkedAt'],
    },
    analytics: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['status', 'message', 'checkedAt'],
    },
    summary: {
      type: 'object',
      properties: {
        healthy: { type: 'boolean' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['healthy', 'checkedAt'],
    },
  },
  required: ['resend', 'analytics', 'summary'],
};

export const integrationSettingSchema = {
  type: 'object',
  properties: {
    configured: { type: 'boolean' },
    source: { type: 'string' },
    maskedValue: { type: 'string' },
  },
  required: ['configured', 'source', 'maskedValue'],
};

export const integrationSettingsResponseSchema = {
  type: 'object',
  properties: {
    resend: integrationSettingSchema,
    analytics: integrationSettingSchema,
    verification: {
      anyOf: [integrationVerificationSchema, { type: 'null' }],
    },
  },
  required: ['resend', 'analytics'],
};

export const adminOpsAuditEntrySchema = {
  type: 'object',
  properties: {
    timestamp: { type: 'string', format: 'date-time' },
    endpoint: { type: 'string' },
    method: { type: 'string' },
    mode: { type: 'string', enum: ['read', 'write'] },
    requestId: { type: ['string', 'null'] },
    actorKey: { type: 'string' },
    userId: { type: ['string', 'null'] },
    ipAddress: { type: 'string' },
    statusCode: { type: 'integer' },
    duration: { type: 'integer' },
    outcome: { type: 'string', enum: ['allowed', 'denied', 'error'] },
    details: { type: ['object', 'null'], additionalProperties: true },
  },
  required: ['timestamp', 'endpoint', 'method', 'mode', 'requestId', 'actorKey', 'userId', 'ipAddress', 'statusCode', 'duration', 'outcome'],
};

export const adminOpsAuditSummarySchema = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    windowHours: { type: 'integer' },
    total: { type: 'integer' },
    deniedCount: { type: 'integer' },
    rateLimitedCount: { type: 'integer' },
    writeCount: { type: 'integer' },
    readCount: { type: 'integer' },
    lastDeniedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['generatedAt', 'windowHours', 'total', 'deniedCount', 'rateLimitedCount', 'writeCount', 'readCount', 'lastDeniedAt'],
};

export const adminAccessCoverageSchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
    routeFiles: { type: 'integer' },
    wrapperFiles: { type: 'integer' },
    driftCount: { type: 'integer' },
    coveragePercent: { type: 'number' },
    driftedFiles: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['available', 'generatedAt', 'routeFiles', 'wrapperFiles', 'driftCount', 'coveragePercent', 'driftedFiles'],
};

export const adminOpsAuditWidgetSchema = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    windowHours: { type: 'integer' },
    total: { type: 'integer' },
    deniedCount: { type: 'integer' },
    rateLimitedCount: { type: 'integer' },
    writeCount: { type: 'integer' },
    readCount: { type: 'integer' },
    lastDeniedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['generatedAt', 'windowHours', 'total', 'deniedCount', 'rateLimitedCount', 'writeCount', 'readCount', 'lastDeniedAt'],
};

export const adminOpsAuditFiltersSchema = {
  type: 'object',
  properties: {
    requestId: { type: ['string', 'null'] },
    startDate: { type: ['string', 'null'], format: 'date-time' },
    endDate: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['requestId', 'startDate', 'endDate'],
};

export const adminAuditLogsDataSchema = {
  type: 'object',
  properties: {
    logs: {
      type: 'array',
      items: {
        anyOf: [
          adminOpsAuditEntrySchema,
          { type: 'object', additionalProperties: true },
        ],
      },
    },
    source: { type: 'string' },
    count: { type: 'integer' },
    totalFiltered: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    summary: adminOpsAuditSummarySchema,
    filters: adminOpsAuditFiltersSchema,
  },
  required: ['logs', 'source', 'count', 'limit', 'offset'],
};

export const subscriptionUserListEntrySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: ['string', 'null'] },
    full_name: { type: ['string', 'null'] },
    subscription_id: { type: ['string', 'null'] },
    tier: { type: ['string', 'null'] },
    status: { type: ['string', 'null'] },
    created_at: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['id', 'email', 'full_name', 'subscription_id', 'tier', 'status', 'created_at'],
};

export const subscriptionUsersListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    users: {
      type: 'array',
      items: subscriptionUserListEntrySchema,
    },
    count: { type: 'integer' },
  },
  required: ['success', 'users', 'count'],
};

export const subscriptionUsersMutationDataSchema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['success', 'message'],
    },
    {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['success', 'data'],
    },
  ],
};

export const adminMessageStatusMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
};

export const adminVerificationEntrySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    placeId: { type: 'string' },
    placeName: { type: 'string' },
    category: { type: ['string', 'null'] },
    rating: { type: ['number', 'null'] },
    requestedAt: { type: 'string', format: 'date-time' },
    reason: { type: ['string', 'null'] },
  },
  required: ['id', 'placeId', 'placeName', 'category', 'rating', 'requestedAt', 'reason'],
};

export const adminVerificationListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    verifications: {
      type: 'array',
      items: adminVerificationEntrySchema,
    },
    count: { type: 'integer' },
  },
  required: ['success', 'verifications', 'count'],
};

export const adminVerificationMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const adminVendorPendingDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        pending: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
        count: { type: 'integer' },
      },
      required: ['pending', 'count'],
    },
  },
  required: ['success', 'data'],
};

export const loyaltyRewardEntrySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reward_name: { type: 'string' },
    description: { type: ['string', 'null'] },
    category: { type: 'string' },
    points_cost: { type: 'integer' },
    tier_requirement: { type: ['string', 'null'] },
    is_active: { type: 'boolean' },
    display_order: { type: ['integer', 'null'] },
  },
  required: [
    'id',
    'reward_name',
    'description',
    'category',
    'points_cost',
    'tier_requirement',
    'is_active',
    'display_order',
  ],
};

export const loyaltyRewardsListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: loyaltyRewardEntrySchema,
    },
  },
  required: ['success', 'data'],
};

export const loyaltyRewardMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: loyaltyRewardEntrySchema,
  },
  required: ['success', 'data'],
};

export const loyaltyAwardMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        type: { type: 'string', enum: ['points', 'badge'] },
        reason: { type: 'string' },
        awarded: {
          anyOf: [{ type: 'integer' }, { type: 'string' }],
        },
      },
      required: ['userId', 'type', 'reason', 'awarded'],
    },
  },
  required: ['success', 'data'],
};

export const badgeAwardMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    badge: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['success', 'badge'],
};

export const adminSubscriptionAnalyticsDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    subscriptions: {
      type: 'object',
      properties: {
        totalSubscriptions: { type: 'integer' },
        activeSubscriptions: { type: 'integer' },
        cancelledSubscriptions: { type: 'integer' },
        byTier: { type: 'object', additionalProperties: { type: 'integer' } },
        mrr: { type: 'number' },
        arr: { type: 'number' },
        averageLifetimeValue: { type: 'number' },
        churnRate: { type: 'number' },
      },
      required: ['totalSubscriptions', 'activeSubscriptions', 'cancelledSubscriptions', 'byTier', 'mrr', 'arr', 'averageLifetimeValue', 'churnRate'],
    },
    webhooks: {
      type: 'object',
      properties: {
        pending: { type: 'integer' },
        failed: { type: 'integer' },
        successful: { type: 'integer' },
        retrying: { type: 'integer' },
        lastDelivery: { type: ['string', 'null'], format: 'date-time' },
      },
      required: ['pending', 'failed', 'successful', 'retrying', 'lastDelivery'],
    },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['success', 'subscriptions', 'webhooks', 'timestamp'],
};

export const adminAnalyticsDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        platformStats: {
          type: 'object',
          properties: {
            totalSessions: { type: 'integer' },
            uniqueUsers: { type: 'integer' },
            totalTimeSpent: { type: 'integer' },
            uniquePages: { type: 'integer' },
            uniqueSearches: { type: 'integer' },
            avgSessionDuration: { type: 'integer' },
            totalConversions: { type: 'integer' },
            period: { type: 'integer' },
          },
          required: ['totalSessions', 'uniqueUsers', 'totalTimeSpent', 'uniquePages', 'uniqueSearches', 'avgSessionDuration', 'totalConversions', 'period'],
        },
        trendingPlaces: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: ['string', 'null'] },
              category: { type: ['string', 'null'] },
              totalViews: { type: 'integer' },
              totalClicks: { type: 'integer' },
              totalLikes: { type: 'integer' },
              totalShares: { type: 'integer' },
              avgRating: { type: 'number' },
              reviewCount: { type: 'integer' },
            },
            required: ['id', 'name', 'category', 'totalViews', 'totalClicks', 'totalLikes', 'totalShares', 'avgRating', 'reviewCount'],
          },
        },
        searchTrends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              count: { type: 'integer' },
              avgResults: { type: 'integer' },
            },
            required: ['query', 'count', 'avgResults'],
          },
        },
        period: { type: 'integer' },
      },
      required: ['platformStats', 'trendingPlaces', 'searchTrends', 'period'],
    },
  },
  required: ['success', 'data'],
};

export const securityGuidelinesDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        guidelines: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
        score: {
          type: 'object',
          properties: {
            score: { type: 'integer' },
            implemented: { type: 'integer' },
            total: { type: 'integer' },
          },
          required: ['score', 'implemented', 'total'],
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
      required: ['guidelines', 'score', 'timestamp'],
    },
  },
  required: ['success', 'data'],
};

export const deploymentBackupConfigSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    enabled: { type: 'boolean' },
    schedule: { type: 'string' },
    retention_days: { type: 'integer' },
    destination: { type: 'string' },
  },
  required: ['id', 'enabled', 'schedule', 'retention_days', 'destination'],
};

export const deploymentBackupListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        backups: {
          type: 'array',
          items: deploymentBackupConfigSchema,
        },
        count: { type: 'integer' },
      },
      required: ['backups', 'count'],
    },
  },
  required: ['success', 'data'],
};

export const deploymentBackupMutationDataSchema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: deploymentBackupConfigSchema,
      },
      required: ['success', 'data'],
    },
    {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['success', 'data'],
    },
  ],
};

export const adminRevenueDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalMRR: { type: 'number' },
            totalActiveSubscriptions: { type: 'integer' },
            churnRatePercent: { type: 'number' },
            totalRevenueAllTime: { type: 'number' },
          },
          required: ['totalMRR', 'totalActiveSubscriptions', 'churnRatePercent', 'totalRevenueAllTime'],
        },
        byTier: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
              monthlyRevenue: { type: 'number' },
            },
            required: ['count', 'monthlyRevenue'],
          },
        },
        dailyRevenue: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              revenue: { type: 'number' },
            },
            required: ['date', 'revenue'],
          },
        },
      },
      required: ['summary', 'byTier', 'dailyRevenue'],
    },
  },
  required: ['success', 'data'],
};

export const moderationStatsDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            pending_reports: { type: 'integer' },
            in_review_reports: { type: 'integer' },
            resolved_reports: { type: 'integer' },
            active_bans: { type: 'integer' },
            total_warnings: { type: 'integer' },
            queue_items: { type: 'integer' },
          },
          required: ['pending_reports', 'in_review_reports', 'resolved_reports', 'active_bans', 'total_warnings', 'queue_items'],
        },
        queue_preview: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
      required: ['stats', 'queue_preview'],
    },
  },
  required: ['success', 'data'],
};

export const moderationFlagSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    content_type: { type: ['string', 'null'] },
    content_id: { type: ['string', 'null'] },
    flagged_by_user_id: { type: ['string', 'null'] },
    flag_reason: { type: ['string', 'null'] },
    flag_description: { type: ['string', 'null'] },
    flag_severity: { type: ['string', 'null'] },
    status: { type: ['string', 'null'] },
    reviewed_by_admin_id: { type: ['string', 'null'] },
    review_notes: { type: ['string', 'null'] },
    created_at: { type: ['string', 'null'], format: 'date-time' },
    reporter_email: { type: ['string', 'null'] },
    reviewer_email: { type: ['string', 'null'] },
  },
  required: ['id', 'content_type', 'content_id', 'flagged_by_user_id', 'flag_reason', 'flag_description', 'flag_severity', 'status', 'reviewed_by_admin_id', 'review_notes', 'created_at', 'reporter_email', 'reviewer_email'],
};

export const moderationFlagsListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        flags: {
          type: 'array',
          items: moderationFlagSchema,
        },
        count: { type: 'integer' },
        status: { type: 'string' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
      required: ['flags', 'count', 'status', 'limit', 'offset'],
    },
  },
  required: ['success', 'data'],
};

export const moderationFlagMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const moderationActionDataSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    report_id: { type: ['string', 'null'] },
    target_user_id: { type: 'string' },
    action_type: { type: 'string' },
    reason: { type: 'string' },
    duration_days: { type: ['integer', 'null'] },
    created_by: { type: 'string' },
    expires_at: { type: ['string', 'null'], format: 'date-time' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'report_id', 'target_user_id', 'action_type', 'reason', 'duration_days', 'created_by', 'expires_at', 'created_at'],
};

export const moderationActionsListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          banned_by: { type: 'string' },
          reason: { type: 'string' },
          duration_days: { type: ['integer', 'null'] },
          appeal_reason: { type: ['string', 'null'] },
          appeal_status: { type: ['string', 'null'] },
          expires_at: { type: ['string', 'null'], format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          is_active: { type: 'boolean' },
        },
        required: ['id', 'user_id', 'banned_by', 'reason', 'duration_days', 'appeal_reason', 'appeal_status', 'expires_at', 'created_at', 'is_active'],
      },
    },
    count: { type: 'integer' },
  },
  required: ['success', 'data', 'count'],
};

export const moderationActionMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: moderationActionDataSchema,
  },
  required: ['success', 'data'],
};

export const moderationReportSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reporter_id: { type: 'string' },
    reported_user_id: { type: ['string', 'null'] },
    content_type: { type: 'string' },
    content_id: { type: 'string' },
    reason: { type: 'string' },
    description: { type: ['string', 'null'] },
    status: { type: 'string' },
    resolved_by: { type: ['string', 'null'] },
    resolution_note: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    resolved_at: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['id', 'reporter_id', 'reported_user_id', 'content_type', 'content_id', 'reason', 'description', 'status', 'resolved_by', 'resolution_note', 'created_at', 'updated_at', 'resolved_at'],
};

export const moderationReportsListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: moderationReportSchema,
    },
    count: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
  },
  required: ['success', 'data', 'count', 'limit', 'offset'],
};

export const moderationReportMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: moderationReportSchema,
  },
  required: ['success', 'data'],
};

export const adminUserListEntrySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: ['string', 'null'] },
    full_name: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    created_at: { type: ['string', 'null'], format: 'date-time' },
    updated_at: { type: ['string', 'null'], format: 'date-time' },
    last_login_at: { type: ['string', 'null'], format: 'date-time' },
    last_activity_at: { type: ['string', 'null'], format: 'date-time' },
    post_count: { type: ['integer', 'null'] },
    review_count: { type: ['integer', 'null'] },
    warning_count: { type: ['integer', 'null'] },
    suspension_count: { type: ['integer', 'null'] },
    active_flags: { type: ['integer', 'null'] },
  },
  required: ['id', 'email', 'full_name', 'role', 'created_at', 'updated_at', 'last_login_at', 'last_activity_at', 'post_count', 'review_count', 'warning_count', 'suspension_count', 'active_flags'],
};

export const adminUsersListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: adminUserListEntrySchema,
        },
        count: { type: 'integer' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
      required: ['users', 'count', 'limit', 'offset', 'hasMore'],
    },
  },
  required: ['success', 'data'],
};

export const adminUserDetailsResponseDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['success', 'data'],
};

export const adminUserMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const moderationQueueItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    queue_type: { type: ['string', 'null'] },
    item_type: { type: ['string', 'null'] },
    item_id: { type: ['string', 'null'] },
    priority: { type: ['string', 'null'] },
    reason: { type: ['string', 'null'] },
    submitted_count: { type: ['integer', 'null'] },
    last_reported_at: { type: ['string', 'null'], format: 'date-time' },
    assigned_to_admin_id: { type: ['string', 'null'] },
    status: { type: ['string', 'null'] },
    created_at: { type: ['string', 'null'], format: 'date-time' },
    assigned_admin_email: { type: ['string', 'null'] },
  },
  required: ['id', 'queue_type', 'item_type', 'item_id', 'priority', 'reason', 'submitted_count', 'last_reported_at', 'assigned_to_admin_id', 'status', 'created_at', 'assigned_admin_email'],
};

export const moderationQueueListDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: moderationQueueItemSchema,
        },
        count: { type: 'integer' },
        status: { type: 'string' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
      required: ['items', 'count', 'status', 'limit', 'offset'],
    },
  },
  required: ['success', 'data'],
};

export const moderationQueueMutationDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const adminStatusSummarySchema = {
  type: 'object',
  properties: {
    integrations: healthStatusSchema,
    regression: healthStatusSchema,
    e2e: healthStatusSchema,
    releaseGate: healthStatusSchema,
    overall: healthStatusSchema,
  },
  required: ['integrations', 'regression', 'e2e', 'releaseGate', 'overall'],
};

export const nightlySummarySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    kind: { type: 'string' },
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
    outcome: { type: 'string' },
    successRatePercent: { type: ['integer', 'null'] },
    recentOutcomes: {
      type: 'array',
      items: { type: 'string' },
    },
    topFailures: {
      type: 'array',
      items: { type: 'string' },
    },
    performanceOptimization: {
      type: ['object', 'null'],
      properties: {
        recommendations: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            highPriority: { type: 'integer' },
            mediumPriority: { type: 'integer' },
          },
          required: ['total', 'highPriority', 'mediumPriority'],
        },
        metrics: {
          type: 'object',
          properties: {
            slowRequestRate: { type: 'integer' },
            cacheHitRate: { type: 'integer' },
          },
          required: ['slowRequestRate', 'cacheHitRate'],
        },
      },
      required: ['recommendations', 'metrics'],
    },
    adminAccessCoverage: {
      anyOf: [adminAccessCoverageSchema, { type: 'null' }],
    },
  },
  required: ['available', 'kind', 'generatedAt', 'outcome', 'successRatePercent', 'recentOutcomes', 'topFailures', 'performanceOptimization', 'adminAccessCoverage'],
};

export const performanceOptimizationSummarySchema = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    recommendations: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        highPriority: { type: 'integer' },
        mediumPriority: { type: 'integer' },
      },
      required: ['total', 'highPriority', 'mediumPriority'],
    },
    metrics: {
      type: 'object',
      properties: {
        slowQueriesCount: { type: 'integer' },
        slowRequestRate: { type: 'integer' },
        cacheHitRate: { type: 'integer' },
        avgRequestDuration: { type: 'integer' },
        p95Duration: { type: 'integer' },
      },
      required: ['slowQueriesCount', 'slowRequestRate', 'cacheHitRate', 'avgRequestDuration', 'p95Duration'],
    },
    cacheStrategies: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
      },
      required: ['count'],
    },
    indexSuggestions: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
        top: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['count', 'top'],
    },
    slowOperations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
          duration: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['type', 'message', 'duration', 'timestamp'],
      },
    },
  },
  required: ['generatedAt', 'recommendations', 'metrics', 'cacheStrategies', 'indexSuggestions', 'slowOperations'],
};

export const releaseGateSummarySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
    finalStatus: { type: 'string' },
    failedStepCount: { type: 'integer' },
    blockingFailedSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    advisoryFailedSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    performanceOptimization: {
      type: ['object', 'null'],
      properties: {
        recommendations: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            highPriority: { type: 'integer' },
            mediumPriority: { type: 'integer' },
          },
          required: ['total', 'highPriority', 'mediumPriority'],
        },
        metrics: {
          type: 'object',
          properties: {
            slowRequestRate: { type: 'integer' },
            cacheHitRate: { type: 'integer' },
          },
          required: ['slowRequestRate', 'cacheHitRate'],
        },
      },
      required: ['recommendations', 'metrics'],
    },
    adminAccessCoverage: {
      anyOf: [adminAccessCoverageSchema, { type: 'null' }],
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          command: { type: 'string' },
          advisory: { type: 'boolean' },
          status: { type: 'string' },
        },
        required: ['step', 'command', 'advisory', 'status'],
      },
    },
  },
  required: ['available', 'generatedAt', 'finalStatus', 'failedStepCount', 'blockingFailedSteps', 'advisoryFailedSteps', 'performanceOptimization', 'adminAccessCoverage', 'steps'],
};

export const releaseGateSummaryResponseDataSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: releaseGateSummarySchema,
  },
  required: ['success', 'data'],
};
