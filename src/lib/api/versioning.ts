/**
 * API Versioning Module
 * Stub implementation for API versioning
 */

export interface APIVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: Date;
}

export class APIVersioning {
  private versions: Map<string, APIVersion> = new Map();

  register(version: string, deprecated = false): APIVersion {
    const apiVersion: APIVersion = {
      version,
      deprecated,
      ...(deprecated ? { sunsetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } : {})
    };
    this.versions.set(version, apiVersion);
    return apiVersion;
  }

  get(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  isDeprecated(version: string): boolean {
    return this.versions.get(version)?.deprecated ?? false;
  }
}

export const apiVersioning = new APIVersioning();
export default apiVersioning;
