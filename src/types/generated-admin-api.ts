// This file is generated. Do not edit manually.
export interface paths {
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

