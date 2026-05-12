import { createHash } from 'node:crypto';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  users?: string[];
  percentage?: number;
}

export class FeatureGating {
  private flags: Map<string, FeatureFlag> = new Map();

  register(feature: FeatureFlag): void {
    this.flags.set(feature.name, feature);
  }

  isEnabled(featureName: string, userId?: string): boolean {
    const flag = this.flags.get(featureName);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.users && userId) {
      return flag.users.includes(userId);
    }
    if (flag.percentage !== undefined) {
      if (!userId) return false;
      const bucket = parseInt(
        createHash('sha256').update(`${userId}:${featureName}`).digest('hex').slice(0, 8),
        16
      ) % 100;
      return bucket < flag.percentage;
    }
    return true;
  }

  getFlag(name: string): FeatureFlag | undefined {
    return this.flags.get(name);
  }
}

export const featureGating = new FeatureGating();
export default featureGating;
