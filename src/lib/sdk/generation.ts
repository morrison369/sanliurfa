export type SDKLanguage = 'typescript' | 'javascript';

export interface SDKGenerateOptions {
  language: SDKLanguage;
  outputPath: string;
  packageName: string;
}

type OpenApiSpec = {
  openapi?: string;
  paths?: Record<string, Record<string, unknown>>;
};

function methodName(method: string, route: string): string {
  const suffix = route
    .replace(/^\/api\//, '')
    .replace(/[{}]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `${method.toLowerCase()}${suffix || 'Root'}`;
}

export class SDKGenerator {
  validateSpec(spec: unknown): spec is OpenApiSpec {
    if (!spec || typeof spec !== 'object') return false;
    const candidate = spec as OpenApiSpec;
    return typeof candidate.openapi === 'string' && !!candidate.paths && typeof candidate.paths === 'object';
  }

  generate(options: SDKGenerateOptions & { spec?: OpenApiSpec }): string {
    const isTypeScript = options.language === 'typescript';
    const header = [
      `// Generated SDK for ${options.packageName}`,
      '// Do not edit manually.',
      '',
    ];

    const typeBlock = isTypeScript
      ? [
          'export interface RequestOptions {',
          '  body?: unknown;',
          '  headers?: Record<string, string>;',
          '}',
          '',
        ]
      : [];

    const client = [
      'export class SanliurfaClient {',
      '  constructor(baseUrl = "") {',
      '    this.baseUrl = baseUrl.replace(/\\/$/, "");',
      '  }',
      '',
      isTypeScript
        ? '  async request(path: string, init: RequestInit = {}): Promise<unknown> {'
        : '  async request(path, init = {}) {',
      '    const response = await fetch(`${this.baseUrl}${path}`, init);',
      '    const contentType = response.headers.get("content-type") || "";',
      '    const data = contentType.includes("application/json") ? await response.json() : await response.text();',
      '    if (!response.ok) throw Object.assign(new Error("API request failed"), { response, data });',
      '    return data;',
      '  }',
      '}',
      '',
    ];

    const helpers = Object.entries(options.spec?.paths || {})
      .flatMap(([route, methods]) =>
        Object.keys(methods).map((method) => {
          const name = methodName(method, route);
          if (isTypeScript) {
            return `export const ${name} = (client: SanliurfaClient, options: RequestOptions = {}) => client.request(${JSON.stringify(route)}, { method: ${JSON.stringify(method.toUpperCase())}, headers: options.headers, body: options.body ? JSON.stringify(options.body) : undefined });`;
          }
          return `export const ${name} = (client, options = {}) => client.request(${JSON.stringify(route)}, { method: ${JSON.stringify(method.toUpperCase())}, headers: options.headers, body: options.body ? JSON.stringify(options.body) : undefined });`;
        }),
      );

    return [...header, ...typeBlock, ...client, ...helpers, ''].join('\n');
  }
}
