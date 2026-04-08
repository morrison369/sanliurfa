/**
 * Phase 156: Threat Modeling & Risk Assessment
 * Threat identification, attack surface mapping, risk scoring
 */

import { logger } from './logger';

interface Threat {
  id: string;
  name: string;
  category: 'spoofing' | 'tampering' | 'repudiation' | 'information_disclosure' | 'denial_of_service' | 'elevation_of_privilege';
  probability: number;
  impact: number;
  riskScore: number;
  affectedAsset: string;
  mitigation?: string;
}

interface AttackSurface {
  entryPoints: string[];
  trustBoundaries: Array<{ from: string; to: string; dataFlow: string }>;
  assetsToDeclassify: string[];
  actors: string[];
}

interface RiskMatrix {
  threats: Threat[];
  prioritized: Threat[];
  averageRisk: number;
  criticalCount: number;
}

interface Mitigation {
  threatId: string;
  strategy: string;
  controls: string[];
  effectiveness: number;
  cost: number;
}

class ThreatModeler {
  private threats: Map<string, Threat[]> = new Map();
  private counter = 0;

  identifyThreats(assetName: string): Threat[] {
    const threats: Threat[] = [];

    const strideThreats = [
      { name: 'Identity Spoofing', category: 'spoofing' as const },
      { name: 'Data Tampering', category: 'tampering' as const },
      { name: 'Unauthorized Access', category: 'elevation_of_privilege' as const },
      { name: 'Data Exposure', category: 'information_disclosure' as const },
      { name: 'Service Disruption', category: 'denial_of_service' as const }
    ];

    strideThreats.forEach((t, idx) => {
      threats.push({
        id: `threat-${assetName}-${++this.counter}`,
        name: t.name,
        category: t.category,
        probability: Math.random() * 0.8,
        impact: Math.random() * 0.9,
        riskScore: Math.random() * 9 + 1,
        affectedAsset: assetName
      });
    });

    this.threats.set(assetName, threats);

    logger.debug('Threats identified', { asset: assetName, count: threats.length });

    return threats;
  }

  getThreatsByCategory(category: string): Threat[] {
    return Array.from(this.threats.values())
      .flat()
      .filter(t => t.category === category);
  }

  getRiskMatrix(threats: Threat[]): RiskMatrix {
    const prioritized = [...threats].sort((a, b) => b.riskScore - a.riskScore);

    return {
      threats,
      prioritized,
      averageRisk: threats.reduce((sum, t) => sum + t.riskScore, 0) / Math.max(threats.length, 1),
      criticalCount: threats.filter(t => t.riskScore > 7).length
    };
  }
}

class AttackSurfaceAnalyzer {
  private surfaces: Map<string, AttackSurface> = new Map();
  private counter = 0;

  mapAttackSurface(systemName: string): AttackSurface {
    const surface: AttackSurface = {
      entryPoints: [
        '/api/auth/login',
        '/api/users',
        '/api/data',
        '/admin/dashboard',
        'database-connection',
        'cache-connection'
      ],
      trustBoundaries: [
        { from: 'external-user', to: 'api-server', dataFlow: 'http-request' },
        { from: 'api-server', to: 'database', dataFlow: 'sql-query' },
        { from: 'api-server', to: 'cache', dataFlow: 'cache-key' }
      ],
      assetsToDeclassify: ['api-keys', 'user-passwords', 'session-tokens', 'database-credentials'],
      actors: ['unauthenticated-user', 'authenticated-user', 'admin', 'attacker']
    };

    this.surfaces.set(systemName, surface);

    logger.debug('Attack surface mapped', { system: systemName, entryPoints: surface.entryPoints.length });

    return surface;
  }

  identifyExposedAssets(surface: AttackSurface): { exposedCount: number; exposedAssets: string[] } {
    return {
      exposedCount: surface.assetsToDeclassify.length,
      exposedAssets: surface.assetsToDeclassify
    };
  }

  getEntryPointRisks(surface: AttackSurface): Array<{ entryPoint: string; riskLevel: 'low' | 'medium' | 'high' }> {
    return surface.entryPoints.map(ep => ({
      entryPoint: ep,
      riskLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
  }
}

class RiskAssessment {
  private assessments: Map<string, { threat: string; score: number }[]> = new Map();
  private counter = 0;

  scoreRisk(threatName: string, likelihood: number, impact: number): { riskScore: number; severity: 'low' | 'medium' | 'high' | 'critical'; priority: number } {
    const riskScore = likelihood * impact * 10;
    const severity: 'low' | 'medium' | 'high' | 'critical' = riskScore > 7 ? 'critical' : riskScore > 5 ? 'high' : riskScore > 3 ? 'medium' : 'low';

    const priorityMap = { critical: 1, high: 2, medium: 3, low: 4 };

    logger.debug('Risk assessed', { threat: threatName, score: riskScore.toFixed(2), severity });

    return {
      riskScore,
      severity,
      priority: priorityMap[severity]
    };
  }

  assessMultipleThreats(threats: Threat[]): Array<{ threat: string; riskScore: number; priority: number }> {
    return threats
      .map(t => ({
        threat: t.name,
        riskScore: t.probability * t.impact * 10,
        priority: t.probability * t.impact * 10 > 7 ? 1 : t.probability * t.impact * 10 > 5 ? 2 : 3
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  getResidualRisk(originalRisk: number, controlEffectiveness: number): number {
    return originalRisk * (1 - controlEffectiveness);
  }
}

class MitigationPlanner {
  private mitigations: Map<string, Mitigation[]> = new Map();
  private counter = 0;

  planMitigation(threatId: string, threatCategory: string): Mitigation {
    const mitigationStrategies: Record<string, Mitigation> = {
      spoofing: {
        threatId,
        strategy: 'Implement strong authentication',
        controls: ['MFA', 'Biometric authentication', 'Hardware security keys'],
        effectiveness: 0.95,
        cost: 50000
      },
      tampering: {
        threatId,
        strategy: 'Implement data integrity checks',
        controls: ['HMAC-SHA256', 'Digital signatures', 'TLS 1.3'],
        effectiveness: 0.98,
        cost: 30000
      },
      elevation_of_privilege: {
        threatId,
        strategy: 'Implement least privilege access',
        controls: ['RBAC', 'Capability-based security', 'Privilege escalation prevention'],
        effectiveness: 0.90,
        cost: 40000
      },
      information_disclosure: {
        threatId,
        strategy: 'Encrypt sensitive data',
        controls: ['AES-256 encryption', 'TLS 1.3', 'Field-level encryption'],
        effectiveness: 0.99,
        cost: 20000
      }
    };

    const mitigation = mitigationStrategies[threatCategory] || mitigationStrategies['spoofing'];

    if (!this.mitigations.has(threatId)) {
      this.mitigations.set(threatId, []);
    }

    this.mitigations.get(threatId)!.push(mitigation);

    logger.debug('Mitigation planned', { threatId, strategy: mitigation.strategy });

    return mitigation;
  }

  getMitigationROI(mitigation: Mitigation, riskBefore: number, riskAfter: number): number {
    const riskReduction = riskBefore - riskAfter;
    return riskReduction / mitigation.cost;
  }
}

export const threatModeler = new ThreatModeler();
export const attackSurfaceAnalyzer = new AttackSurfaceAnalyzer();
export const riskAssessment = new RiskAssessment();
export const mitigationPlanner = new MitigationPlanner();

export { Threat, AttackSurface, RiskMatrix, Mitigation };
