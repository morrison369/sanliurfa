// This file is generated. Do not edit manually.
export interface paths {
    "/api/admin/analytics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get platform analytics overview for admins */
        get: {
            parameters: {
                query?: {
                    days?: number;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Analytics dashboard snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    period: number;
                                    platformStats: {
                                        avgSessionDuration: number;
                                        period: number;
                                        totalConversions: number;
                                        totalSessions: number;
                                        totalTimeSpent: number;
                                        uniquePages: number;
                                        uniqueSearches: number;
                                        uniqueUsers: number;
                                    };
                                    searchTrends: {
                                        avgResults: number;
                                        count: number;
                                        query: string;
                                    }[];
                                    trendingPlaces: {
                                        avgRating: number;
                                        category: string | null;
                                        id: string;
                                        name: string | null;
                                        reviewCount: number;
                                        totalClicks: number;
                                        totalLikes: number;
                                        totalShares: number;
                                        totalViews: number;
                                    }[];
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin audit logs and admin ops audit sink */
        get: {
            parameters: {
                query?: {
                    endDate?: string;
                    format?: "csv";
                    limit?: number;
                    offset?: number;
                    requestId?: string;
                    source?: string;
                    startDate?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Audit logs */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                                filters?: {
                                    /** Format: date-time */
                                    endDate: string | null;
                                    requestId: string | null;
                                    /** Format: date-time */
                                    startDate: string | null;
                                };
                                limit: number;
                                logs: ({
                                    actorKey: string;
                                    details?: {
                                        [key: string]: unknown;
                                    } | null;
                                    duration: number;
                                    endpoint: string;
                                    ipAddress: string;
                                    method: string;
                                    /** @enum {string} */
                                    mode: "read" | "write";
                                    /** @enum {string} */
                                    outcome: "allowed" | "denied" | "error";
                                    requestId: string | null;
                                    statusCode: number;
                                    /** Format: date-time */
                                    timestamp: string;
                                    userId: string | null;
                                } | {
                                    [key: string]: unknown;
                                })[];
                                offset: number;
                                source: string;
                                summary?: {
                                    deniedCount: number;
                                    /** Format: date-time */
                                    generatedAt: string;
                                    /** Format: date-time */
                                    lastDeniedAt: string | null;
                                    rateLimitedCount: number;
                                    readCount: number;
                                    total: number;
                                    windowHours: number;
                                    writeCount: number;
                                };
                                totalFiltered?: number;
                            };
                        };
                        "text/csv": string;
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/badges/award": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Award badge to place */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        badgeType: string;
                        placeId: string;
                        reason?: string;
                    };
                };
            };
            responses: {
                /** @description Badge awarded to place */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                badge: {
                                    [key: string]: unknown;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Place or badge not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/dashboard/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin dashboard overview with operational summaries */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Dashboard overview snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    adminAccessCoverage: {
                                        available: boolean;
                                        coveragePercent: number;
                                        driftCount: number;
                                        driftedFiles: string[];
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        routeFiles: number;
                                        wrapperFiles: number;
                                    };
                                    adminOpsAudit: {
                                        deniedCount: number;
                                        /** Format: date-time */
                                        generatedAt: string;
                                        /** Format: date-time */
                                        lastDeniedAt: string | null;
                                        rateLimitedCount: number;
                                        readCount: number;
                                        total: number;
                                        windowHours: number;
                                        writeCount: number;
                                    };
                                    artifactHealth: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        performanceOps: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactHealthSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    integrations: {
                                        analytics: {
                                            configured: boolean;
                                            source: string;
                                        };
                                        resend: {
                                            configured: boolean;
                                            source: string;
                                        };
                                        summary: {
                                            configuredCount: number;
                                            fullyConfigured: boolean;
                                            total: number;
                                        };
                                        verification: {
                                            analytics: {
                                                /** Format: date-time */
                                                checkedAt: string;
                                                message: string;
                                                status: string;
                                            };
                                            resend: {
                                                /** Format: date-time */
                                                checkedAt: string;
                                                message: string;
                                                status: string;
                                            };
                                            summary: {
                                                /** Format: date-time */
                                                checkedAt: string;
                                                healthy: boolean;
                                            };
                                        };
                                    };
                                    nightly: {
                                        e2e: {
                                            adminAccessCoverage: {
                                                available: boolean;
                                                coveragePercent: number;
                                                driftCount: number;
                                                driftedFiles: string[];
                                                /** Format: date-time */
                                                generatedAt: string | null;
                                                routeFiles: number;
                                                wrapperFiles: number;
                                            } | null;
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            kind: string;
                                            outcome: string;
                                            performanceOptimization: {
                                                metrics: {
                                                    cacheHitRate: number;
                                                    slowRequestRate: number;
                                                };
                                                recommendations: {
                                                    highPriority: number;
                                                    mediumPriority: number;
                                                    total: number;
                                                };
                                            } | null;
                                            recentOutcomes: string[];
                                            successRatePercent: number | null;
                                            topFailures: string[];
                                        };
                                        regression: {
                                            adminAccessCoverage: {
                                                available: boolean;
                                                coveragePercent: number;
                                                driftCount: number;
                                                driftedFiles: string[];
                                                /** Format: date-time */
                                                generatedAt: string | null;
                                                routeFiles: number;
                                                wrapperFiles: number;
                                            } | null;
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            kind: string;
                                            outcome: string;
                                            performanceOptimization: {
                                                metrics: {
                                                    cacheHitRate: number;
                                                    slowRequestRate: number;
                                                };
                                                recommendations: {
                                                    highPriority: number;
                                                    mediumPriority: number;
                                                    total: number;
                                                };
                                            } | null;
                                            recentOutcomes: string[];
                                            successRatePercent: number | null;
                                            topFailures: string[];
                                        };
                                    };
                                    performanceOptimization: {
                                        cacheStrategies: {
                                            count: number;
                                        };
                                        /** Format: date-time */
                                        generatedAt: string;
                                        indexSuggestions: {
                                            count: number;
                                            top: string[];
                                        };
                                        metrics: {
                                            avgRequestDuration: number;
                                            cacheHitRate: number;
                                            p95Duration: number;
                                            slowQueriesCount: number;
                                            slowRequestRate: number;
                                        };
                                        recommendations: {
                                            highPriority: number;
                                            mediumPriority: number;
                                            total: number;
                                        };
                                        slowOperations: {
                                            duration: number;
                                            message: string;
                                            /** Format: date-time */
                                            timestamp: string;
                                            type: string;
                                        }[];
                                    };
                                    period: number;
                                    releaseGate: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            coveragePercent: number;
                                            driftCount: number;
                                            driftedFiles: string[];
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            routeFiles: number;
                                            wrapperFiles: number;
                                        } | null;
                                        advisoryFailedSteps: string[];
                                        available: boolean;
                                        blockingFailedSteps: string[];
                                        failedStepCount: number;
                                        finalStatus: string;
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        performanceOptimization: {
                                            metrics: {
                                                cacheHitRate: number;
                                                slowRequestRate: number;
                                            };
                                            recommendations: {
                                                highPriority: number;
                                                mediumPriority: number;
                                                total: number;
                                            };
                                        } | null;
                                        steps: {
                                            advisory: boolean;
                                            command: string;
                                            status: string;
                                            step: string;
                                        }[];
                                    };
                                    statusSummary: {
                                        /** @enum {string} */
                                        e2e: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        integrations: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        regression: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        releaseGate: "healthy" | "degraded" | "blocked";
                                    };
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/deployment/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List backup configurations */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Backup configuration list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    backups: {
                                        destination: string;
                                        enabled: boolean;
                                        id: string;
                                        retention_days: number;
                                        schedule: string;
                                    }[];
                                    count: number;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Update backup configuration */
        put: {
            parameters: {
                query: {
                    id: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        destination?: "local" | "s3" | "gcs";
                        enabled?: boolean;
                        retention_days?: number;
                        /** @enum {string} */
                        schedule?: "hourly" | "daily" | "weekly";
                    };
                };
            };
            responses: {
                /** @description Backup configuration updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    destination: string;
                                    enabled: boolean;
                                    id: string;
                                    retention_days: number;
                                    schedule: string;
                                };
                                success: boolean;
                            } | {
                                data: {
                                    [key: string]: unknown;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Backup ID required */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Backup config not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Trigger backup job */
        post: {
            parameters: {
                query: {
                    id: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Backup job triggered */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    destination: string;
                                    enabled: boolean;
                                    id: string;
                                    retention_days: number;
                                    schedule: string;
                                };
                                success: boolean;
                            } | {
                                data: {
                                    [key: string]: unknown;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Backup ID required */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Backup failed */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/deployment/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Deployment readiness and artifact health for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deployment status snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    artifactHealth: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        performanceOps: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactHealthSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    checklist: Record<string, never>;
                                    environment: {
                                        logLevel: string;
                                        maintenanceMode: boolean;
                                        name: string;
                                        sslEnabled: boolean;
                                        url: string;
                                    };
                                    integrations: {
                                        analytics: {
                                            configured: boolean;
                                            source: string;
                                        };
                                        resend: {
                                            configured: boolean;
                                            source: string;
                                        };
                                        summary: {
                                            configuredCount: number;
                                            fullyConfigured: boolean;
                                            total: number;
                                        };
                                    };
                                    readiness: Record<string, never>;
                                    /** Format: date-time */
                                    timestamp: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/loyalty/award": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Award loyalty points or badge manually */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        amount?: number;
                        badgeKey?: string;
                        reason: string;
                        /** @enum {string} */
                        type: "points" | "badge";
                        userId: string;
                    };
                };
            };
            responses: {
                /** @description Loyalty award completed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    awarded: number | string;
                                    reason: string;
                                    /** @enum {string} */
                                    type: "points" | "badge";
                                    userId: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Badge already awarded */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/loyalty/rewards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List loyalty rewards for admin catalog management */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Loyalty rewards catalog */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    category: string;
                                    description: string | null;
                                    display_order: number | null;
                                    id: string;
                                    is_active: boolean;
                                    points_cost: number;
                                    reward_name: string;
                                    tier_requirement: string | null;
                                }[];
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Create loyalty reward */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        category: string;
                        description?: string;
                        is_active?: boolean;
                        points_cost: number;
                        reward_name: string;
                        stock_quantity?: number;
                        tier_requirement?: string;
                    };
                };
            };
            responses: {
                /** @description Loyalty reward created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    category: string;
                                    description: string | null;
                                    display_order: number | null;
                                    id: string;
                                    is_active: boolean;
                                    points_cost: number;
                                    reward_name: string;
                                    tier_requirement: string | null;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/messages/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Update contact message status */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** @enum {string} */
                        status: "new" | "read" | "replied" | "archived";
                    };
                };
            };
            responses: {
                /** @description Message status updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/moderation/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get moderation action history for a user */
        get: {
            parameters: {
                query: {
                    user_id: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Moderation action history */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                                data: {
                                    appeal_reason: string | null;
                                    appeal_status: string | null;
                                    banned_by: string;
                                    /** Format: date-time */
                                    created_at: string;
                                    duration_days: number | null;
                                    /** Format: date-time */
                                    expires_at: string | null;
                                    id: string;
                                    is_active: boolean;
                                    reason: string;
                                    user_id: string;
                                }[];
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Create moderation action */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        action_type: "warning" | "content_removed" | "suspend" | "ban" | "appeal_granted";
                        duration_days?: number;
                        reason: string;
                        report_id: string;
                        target_user_id: string;
                    };
                };
            };
            responses: {
                /** @description Moderation action created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    action_type: string;
                                    /** Format: date-time */
                                    created_at: string;
                                    created_by: string;
                                    duration_days: number | null;
                                    /** Format: date-time */
                                    expires_at: string | null;
                                    id: string;
                                    reason: string;
                                    report_id: string | null;
                                    target_user_id: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/moderation/flags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List moderation content flags */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                    status?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Content flags list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    count: number;
                                    flags: {
                                        content_id: string | null;
                                        content_type: string | null;
                                        /** Format: date-time */
                                        created_at: string | null;
                                        flag_description: string | null;
                                        flag_reason: string | null;
                                        flag_severity: string | null;
                                        flagged_by_user_id: string | null;
                                        id: string;
                                        reporter_email: string | null;
                                        review_notes: string | null;
                                        reviewed_by_admin_id: string | null;
                                        reviewer_email: string | null;
                                        status: string | null;
                                    }[];
                                    limit: number;
                                    offset: number;
                                    status: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Review moderation content flag */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        decision: "approved" | "rejected" | "escalated";
                        flagId: string;
                        notes?: string;
                    };
                };
            };
            responses: {
                /** @description Content flag reviewed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/moderation/queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get moderation queue items */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                    status?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Moderation queue snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    count: number;
                                    items: {
                                        assigned_admin_email: string | null;
                                        assigned_to_admin_id: string | null;
                                        /** Format: date-time */
                                        created_at: string | null;
                                        id: string;
                                        item_id: string | null;
                                        item_type: string | null;
                                        /** Format: date-time */
                                        last_reported_at: string | null;
                                        priority: string | null;
                                        queue_type: string | null;
                                        reason: string | null;
                                        status: string | null;
                                        submitted_count: number | null;
                                    }[];
                                    limit: number;
                                    offset: number;
                                    status: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Assign or resolve moderation queue item */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        action: "assign" | "resolve";
                        queueItemId: string;
                        resolution?: string;
                    };
                };
            };
            responses: {
                /** @description Moderation queue action completed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/moderation/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List moderation reports */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                    status?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Moderation reports list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                                data: {
                                    content_id: string;
                                    content_type: string;
                                    /** Format: date-time */
                                    created_at: string;
                                    description: string | null;
                                    id: string;
                                    reason: string;
                                    reported_user_id: string | null;
                                    reporter_id: string;
                                    resolution_note: string | null;
                                    /** Format: date-time */
                                    resolved_at: string | null;
                                    resolved_by: string | null;
                                    status: string;
                                    /** Format: date-time */
                                    updated_at: string;
                                }[];
                                limit: number;
                                offset: number;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Update moderation report status */
        put: {
            parameters: {
                query: {
                    id: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        resolution_note?: string;
                        /** @enum {string} */
                        status: "pending" | "under_review" | "resolved" | "dismissed";
                    };
                };
            };
            responses: {
                /** @description Moderation report updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    content_id: string;
                                    content_type: string;
                                    /** Format: date-time */
                                    created_at: string;
                                    description: string | null;
                                    id: string;
                                    reason: string;
                                    reported_user_id: string | null;
                                    reporter_id: string;
                                    resolution_note: string | null;
                                    /** Format: date-time */
                                    resolved_at: string | null;
                                    resolved_by: string | null;
                                    status: string;
                                    /** Format: date-time */
                                    updated_at: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/moderation/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get moderation statistics and queue preview */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Moderation statistics snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    queue_preview: {
                                        [key: string]: unknown;
                                    }[];
                                    stats: {
                                        active_bans: number;
                                        in_review_reports: number;
                                        pending_reports: number;
                                        queue_items: number;
                                        resolved_reports: number;
                                        total_warnings: number;
                                    };
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/performance/optimization": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Performance optimization recommendations for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Optimization recommendations */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    artifactHealth: {
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactHealthSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    cacheStrategies: {
                                        strategies: string[];
                                        strategiesCount: number;
                                    };
                                    indexSuggestions: string[];
                                    metrics: {
                                        avgRequestDuration: number;
                                        cacheHitRate: number;
                                        p95Duration: number;
                                        slowQueriesCount: number;
                                        slowRequestRate: number;
                                    };
                                    recommendations: {
                                        action: string;
                                        description: string;
                                        /** @enum {string} */
                                        priority: "high" | "medium" | "low";
                                        title: string;
                                    }[];
                                    slowOperations: {
                                        duration: number;
                                        message: string;
                                        timestamp: number;
                                        type: string;
                                    }[];
                                    /** Format: date-time */
                                    timestamp: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/revenue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Revenue dashboard summary for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Revenue analytics snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    byTier: {
                                        [key: string]: {
                                            count: number;
                                            monthlyRevenue: number;
                                        };
                                    };
                                    dailyRevenue: {
                                        date: string;
                                        revenue: number;
                                    }[];
                                    summary: {
                                        churnRatePercent: number;
                                        totalActiveSubscriptions: number;
                                        totalMRR: number;
                                        totalRevenueAllTime: number;
                                    };
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Authentication required */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/security/guidelines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Security guidelines and score snapshot */
        get: {
            parameters: {
                query?: {
                    category?: string;
                    filter?: "all" | "unimplemented" | "critical";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Security guidelines snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    guidelines: {
                                        [key: string]: unknown;
                                    }[];
                                    score: {
                                        implemented: number;
                                        score: number;
                                        total: number;
                                    };
                                    /** Format: date-time */
                                    timestamp: string;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/subscriptions/analytics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Subscription analytics and webhook delivery status */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Subscription analytics snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                subscriptions: {
                                    activeSubscriptions: number;
                                    arr: number;
                                    averageLifetimeValue: number;
                                    byTier: {
                                        [key: string]: number;
                                    };
                                    cancelledSubscriptions: number;
                                    churnRate: number;
                                    mrr: number;
                                    totalSubscriptions: number;
                                };
                                success: boolean;
                                /** Format: date-time */
                                timestamp: string;
                                webhooks: {
                                    failed: number;
                                    /** Format: date-time */
                                    lastDelivery: string | null;
                                    pending: number;
                                    retrying: number;
                                    successful: number;
                                };
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/subscriptions/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List users with subscriptions */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    search?: string;
                    status?: string;
                    tier?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Subscription users list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                                success: boolean;
                                users: {
                                    /** Format: date-time */
                                    created_at: string | null;
                                    email: string | null;
                                    full_name: string | null;
                                    id: string;
                                    status: string | null;
                                    subscription_id: string | null;
                                    tier: string | null;
                                }[];
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Manage user subscription actions */
        post: {
            parameters: {
                query: {
                    action: "change_tier" | "get_details";
                    userId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        newTierId?: string;
                        reason?: string;
                    };
                };
            };
            responses: {
                /** @description Subscription management result */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            } | {
                                data: {
                                    [key: string]: unknown;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Invalid payload or action */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Resource not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/system/artifact-health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Artifact health snapshot for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Artifact freshness snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    artifacts: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        performanceOps: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    summary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/system/integration-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin integration settings and verification status */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Integration settings snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    analytics: {
                                        configured: boolean;
                                        maskedValue: string;
                                        source: string;
                                    };
                                    resend: {
                                        configured: boolean;
                                        maskedValue: string;
                                        source: string;
                                    };
                                    verification?: {
                                        analytics: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            message: string;
                                            status: string;
                                        };
                                        resend: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            message: string;
                                            status: string;
                                        };
                                        summary: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            healthy: boolean;
                                        };
                                    } | null;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Update admin integration settings */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        analyticsId?: string;
                        resendApiKey?: string;
                    };
                };
            };
            responses: {
                /** @description Updated integration settings snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    analytics: {
                                        configured: boolean;
                                        maskedValue: string;
                                        source: string;
                                    };
                                    resend: {
                                        configured: boolean;
                                        maskedValue: string;
                                        source: string;
                                    };
                                    verification?: {
                                        analytics: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            message: string;
                                            status: string;
                                        };
                                        resend: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            message: string;
                                            status: string;
                                        };
                                        summary: {
                                            /** Format: date-time */
                                            checkedAt: string;
                                            healthy: boolean;
                                        };
                                    } | null;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Invalid payload */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/system/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin system metrics and operational health snapshot */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description System metrics snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    adminAccessCoverage: {
                                        available: boolean;
                                        coveragePercent: number;
                                        driftCount: number;
                                        driftedFiles: string[];
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        routeFiles: number;
                                        wrapperFiles: number;
                                    };
                                    adminOpsAudit: {
                                        deniedCount: number;
                                        /** Format: date-time */
                                        generatedAt: string;
                                        /** Format: date-time */
                                        lastDeniedAt: string | null;
                                        rateLimitedCount: number;
                                        readCount: number;
                                        total: number;
                                        windowHours: number;
                                        writeCount: number;
                                    };
                                    artifactHealth: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        performanceOps: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactHealthSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    health: {
                                        integrations: {
                                            analytics: {
                                                configured: boolean;
                                                source: string;
                                            };
                                            resend: {
                                                configured: boolean;
                                                source: string;
                                            };
                                            summary: {
                                                configuredCount: number;
                                                fullyConfigured: boolean;
                                                total: number;
                                            };
                                        };
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                        /** Format: date-time */
                                        timestamp: string;
                                    };
                                    nightly: {
                                        e2e: {
                                            adminAccessCoverage: {
                                                available: boolean;
                                                coveragePercent: number;
                                                driftCount: number;
                                                driftedFiles: string[];
                                                /** Format: date-time */
                                                generatedAt: string | null;
                                                routeFiles: number;
                                                wrapperFiles: number;
                                            } | null;
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            kind: string;
                                            outcome: string;
                                            performanceOptimization: {
                                                metrics: {
                                                    cacheHitRate: number;
                                                    slowRequestRate: number;
                                                };
                                                recommendations: {
                                                    highPriority: number;
                                                    mediumPriority: number;
                                                    total: number;
                                                };
                                            } | null;
                                            recentOutcomes: string[];
                                            successRatePercent: number | null;
                                            topFailures: string[];
                                        };
                                        regression: {
                                            adminAccessCoverage: {
                                                available: boolean;
                                                coveragePercent: number;
                                                driftCount: number;
                                                driftedFiles: string[];
                                                /** Format: date-time */
                                                generatedAt: string | null;
                                                routeFiles: number;
                                                wrapperFiles: number;
                                            } | null;
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            kind: string;
                                            outcome: string;
                                            performanceOptimization: {
                                                metrics: {
                                                    cacheHitRate: number;
                                                    slowRequestRate: number;
                                                };
                                                recommendations: {
                                                    highPriority: number;
                                                    mediumPriority: number;
                                                    total: number;
                                                };
                                            } | null;
                                            recentOutcomes: string[];
                                            successRatePercent: number | null;
                                            topFailures: string[];
                                        };
                                    };
                                    performanceOptimization: {
                                        cacheStrategies: {
                                            count: number;
                                        };
                                        /** Format: date-time */
                                        generatedAt: string;
                                        indexSuggestions: {
                                            count: number;
                                            top: string[];
                                        };
                                        metrics: {
                                            avgRequestDuration: number;
                                            cacheHitRate: number;
                                            p95Duration: number;
                                            slowQueriesCount: number;
                                            slowRequestRate: number;
                                        };
                                        recommendations: {
                                            highPriority: number;
                                            mediumPriority: number;
                                            total: number;
                                        };
                                        slowOperations: {
                                            duration: number;
                                            message: string;
                                            /** Format: date-time */
                                            timestamp: string;
                                            type: string;
                                        }[];
                                    };
                                    releaseGate: {
                                        adminAccessCoverage: {
                                            available: boolean;
                                            coveragePercent: number;
                                            driftCount: number;
                                            driftedFiles: string[];
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            routeFiles: number;
                                            wrapperFiles: number;
                                        } | null;
                                        advisoryFailedSteps: string[];
                                        available: boolean;
                                        blockingFailedSteps: string[];
                                        failedStepCount: number;
                                        finalStatus: string;
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        performanceOptimization: {
                                            metrics: {
                                                cacheHitRate: number;
                                                slowRequestRate: number;
                                            };
                                            recommendations: {
                                                highPriority: number;
                                                mediumPriority: number;
                                                total: number;
                                            };
                                        } | null;
                                        steps: {
                                            advisory: boolean;
                                            command: string;
                                            status: string;
                                            step: string;
                                        }[];
                                    };
                                    statusSummary: {
                                        /** @enum {string} */
                                        e2e: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        integrations: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        regression: "healthy" | "degraded" | "blocked";
                                        /** @enum {string} */
                                        releaseGate: "healthy" | "degraded" | "blocked";
                                    };
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/system/release-gate-summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get release gate summary for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Release gate summary snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    adminAccessCoverage: {
                                        available: boolean;
                                        coveragePercent: number;
                                        driftCount: number;
                                        driftedFiles: string[];
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        routeFiles: number;
                                        wrapperFiles: number;
                                    } | null;
                                    advisoryFailedSteps: string[];
                                    available: boolean;
                                    blockingFailedSteps: string[];
                                    failedStepCount: number;
                                    finalStatus: string;
                                    /** Format: date-time */
                                    generatedAt: string | null;
                                    performanceOptimization: {
                                        metrics: {
                                            cacheHitRate: number;
                                            slowRequestRate: number;
                                        };
                                        recommendations: {
                                            highPriority: number;
                                            mediumPriority: number;
                                            total: number;
                                        };
                                    } | null;
                                    steps: {
                                        advisory: boolean;
                                        command: string;
                                        status: string;
                                        step: string;
                                    }[];
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List users for admin management */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Admin user list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    count: number;
                                    hasMore: boolean;
                                    limit: number;
                                    offset: number;
                                    users: {
                                        active_flags: number | null;
                                        /** Format: date-time */
                                        created_at: string | null;
                                        email: string | null;
                                        full_name: string | null;
                                        id: string;
                                        /** Format: date-time */
                                        last_activity_at: string | null;
                                        /** Format: date-time */
                                        last_login_at: string | null;
                                        post_count: number | null;
                                        review_count: number | null;
                                        role: string | null;
                                        suspension_count: number | null;
                                        /** Format: date-time */
                                        updated_at: string | null;
                                        warning_count: number | null;
                                    }[];
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get detailed user information */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User detail snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    [key: string]: unknown;
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Perform admin action on user */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        action: "flag" | "changeRole" | "log";
                        actionType?: string;
                        changes?: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        expiresAt?: string;
                        flagType?: string;
                        newRole?: string;
                        reason?: string;
                        severity?: string;
                    };
                };
            };
            responses: {
                /** @description User action completed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/vendor/pending": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List pending vendor verification requests */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pending vendor verification list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                data: {
                                    count: number;
                                    pending: {
                                        [key: string]: unknown;
                                    }[];
                                };
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/verifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List pending place verification requests */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pending verification list */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                                success: boolean;
                                verifications: {
                                    category: string | null;
                                    id: string;
                                    placeId: string;
                                    placeName: string;
                                    rating: number | null;
                                    reason: string | null;
                                    /** Format: date-time */
                                    requestedAt: string;
                                }[];
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/verifications/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Approve place verification request */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        reason?: string;
                    };
                };
            };
            responses: {
                /** @description Verification approved */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Verification request not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/verifications/{id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reject place verification request */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        reason: string;
                    };
                };
            };
            responses: {
                /** @description Verification rejected */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                message: string;
                                success: boolean;
                            };
                        };
                    };
                };
                /** @description Admin access required */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Verification request not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Rate limited */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Runtime health check */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description System is healthy or degraded */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                checks: {
                                    artifacts: {
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    database: {
                                        responseTime?: number;
                                        /** @enum {string} */
                                        status: "up" | "down";
                                    };
                                    integrations: {
                                        analytics: {
                                            configured: boolean;
                                        };
                                        resend: {
                                            configured: boolean;
                                        };
                                    };
                                    redis: {
                                        responseTime?: number;
                                        /** @enum {string} */
                                        status: "up" | "down";
                                    };
                                };
                                /** @enum {string} */
                                status: "healthy" | "degraded" | "blocked";
                                /** Format: date-time */
                                timestamp: string;
                                uptime: number;
                                version: string;
                            };
                        };
                    };
                };
                /** @description System is blocked */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health/detailed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detailed runtime health check for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Detailed health report */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                checks: {
                                    artifacts: {
                                        nightlyE2E: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        nightlyRegression: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                        releaseGate: {
                                            available: boolean;
                                            /** Format: date-time */
                                            generatedAt: string | null;
                                            /** @enum {string} */
                                            status: "healthy" | "degraded" | "blocked";
                                        };
                                    };
                                    artifactSummary: {
                                        blockedCount: number;
                                        degradedCount: number;
                                        healthyCount: number;
                                        /** @enum {string} */
                                        overall: "healthy" | "degraded" | "blocked";
                                        total: number;
                                    };
                                    database: {
                                        error?: string;
                                        poolAvailable?: number;
                                        poolSize?: number;
                                        responseTime?: number;
                                        /** @enum {string} */
                                        status: "up" | "down";
                                    };
                                    redis: {
                                        error?: string;
                                        responseTime?: number;
                                        /** @enum {string} */
                                        status: "up" | "down";
                                    };
                                };
                                /** @enum {string} */
                                status: "healthy" | "degraded" | "blocked";
                                system: {
                                    cpuUsage: {
                                        system: number;
                                        user: number;
                                    };
                                    memory: {
                                        external: number;
                                        heapTotal: number;
                                        heapUsed: number;
                                        rss: number;
                                    };
                                    nodeVersion: string;
                                    platform: string;
                                };
                                /** Format: date-time */
                                timestamp: string;
                                uptime: number;
                                version: string;
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description System is blocked */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/performance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detailed performance metrics for admins */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Performance telemetry snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                artifactHealth: {
                                    nightlyE2E: {
                                        available: boolean;
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                    };
                                    nightlyRegression: {
                                        available: boolean;
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                    };
                                    releaseGate: {
                                        available: boolean;
                                        /** Format: date-time */
                                        generatedAt: string | null;
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                    };
                                };
                                artifactHealthSummary: {
                                    blockedCount: number;
                                    degradedCount: number;
                                    healthyCount: number;
                                    /** @enum {string} */
                                    overall: "healthy" | "degraded" | "blocked";
                                    total: number;
                                };
                                serviceLevelObjectives: {
                                    oauth: {
                                        authorizeRequests: number;
                                        callbackErrorRatePercent: number;
                                        callbackRequests: number;
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                    };
                                    webhookIngestion: {
                                        duplicateCount: number;
                                        errorCount: number;
                                        p95DurationMs: number;
                                        requests: number;
                                        retryDeferredCount: number;
                                        retryExhaustedCount: number;
                                        /** @enum {string} */
                                        status: "healthy" | "degraded" | "blocked";
                                        successCount: number;
                                    };
                                };
                                slowestQueries: {
                                    duration: string;
                                    query: string;
                                    rowCount?: number;
                                    /** Format: date-time */
                                    timestamp: string;
                                }[];
                                slowOperations: {
                                    context?: Record<string, never>;
                                    duration: string;
                                    message: string;
                                    /** Format: date-time */
                                    timestamp: string;
                                    type: string;
                                }[];
                                summary: {
                                    avgQueryDuration: string;
                                    maxQueryDuration: string;
                                    slowQueryCount: number;
                                    slowRequestCount: number;
                                    totalRequests: number;
                                };
                                /** Format: date-time */
                                timestamp: string;
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/webhooks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List user webhooks */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of webhooks */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                active?: boolean;
                                /** Format: date-time */
                                createdAt?: string;
                                event?: string;
                                /** Format: uuid */
                                id?: string;
                                /** Format: uri */
                                url?: string;
                            }[];
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Register new webhook */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example place.created */
                        event: string;
                        /** @description Optional secret for HMAC signature */
                        secret?: string;
                        /** Format: uri */
                        url: string;
                    };
                };
            };
            responses: {
                /** @description Webhook created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/webhooks/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete webhook */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Webhook deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Webhook not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/webhooks/analytics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get webhook analytics and metrics */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Webhook metrics */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                deliveredEvents?: number;
                                failedEvents?: number;
                                pendingEvents?: number;
                                successRate?: number;
                                totalEvents?: number;
                                totalWebhooks?: number;
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/webhooks/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retry failed webhook events */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * Format: uuid
                         * @description Retry specific event
                         */
                        eventId?: string;
                        /**
                         * Format: uuid
                         * @description Retry all failed for webhook
                         */
                        webhookId?: string;
                    };
                };
            };
            responses: {
                /** @description Events queued for retry */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/webhooks/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Test webhook with sample event */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Optional test payload */
                        testData?: Record<string, never>;
                        /** Format: uuid */
                        webhookId: string;
                    };
                };
            };
            responses: {
                /** @description Test webhook sent */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Webhook not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

