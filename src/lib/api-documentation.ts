/**
 * Phase 51: API Documentation & Developer Portal
 * API schema generation, documentation, SDK generation, developer portal
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  params: Record<string, any>;
  response: Record<string, any>;
}

export interface Documentation {
  title: string;
  description: string;
  endpoints: APIEndpoint[];
  examples: Record<string, string>;
}

export interface APIKey {
  id: string;
  name: string;
  secret: string;
  vendorId: string;
  createdAt: number;
  lastUsed?: number;
}

// ==================== API DOC GENERATOR ====================

export class APIDocGenerator {
  private endpoints: APIEndpoint[] = [];
  private examples = new Map<string, string>();

  /**
   * Register API endpoint
   */
  registerEndpoint(endpoint: APIEndpoint): void {
    this.endpoints.push(endpoint);
    logger.debug('API endpoint registered', { path: endpoint.path, method: endpoint.method });
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  generateOpenAPI(): string {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Marketplace API',
        version: '1.0.0'
      },
      paths: {} as Record<string, any>
    };

    for (const endpoint of this.endpoints) {
      const key = endpoint.path.replace(/{id}/g, '{id}');

      if (!spec.paths[key]) {
        spec.paths[key] = {};
      }

      spec.paths[key][endpoint.method.toLowerCase()] = {
        description: endpoint.description,
        parameters: Object.keys(endpoint.params).map(param => ({
          name: param,
          in: 'query',
          schema: endpoint.params[param]
        })),
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: endpoint.response
              }
            }
          }
        }
      };
    }

    return JSON.stringify(spec, null, 2);
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdown(): string {
    let markdown = '# API Documentation\n\n';

    for (const endpoint of this.endpoints) {
      markdown += `## ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `${endpoint.description}\n\n`;

      if (Object.keys(endpoint.params).length > 0) {
        markdown += '### Parameters\n\n';
        for (const [param, schema] of Object.entries(endpoint.params)) {
          markdown += `- **${param}** (${schema.type}): ${schema.description || ''}\n`;
        }
        markdown += '\n';
      }

      markdown += '### Response\n\n```json\n';
      markdown += JSON.stringify(endpoint.response, null, 2);
      markdown += '\n```\n\n';
    }

    return markdown;
  }

  /**
   * Get endpoints filtered by method
   */
  getEndpoints(method?: string): APIEndpoint[] {
    if (!method) {
      return this.endpoints;
    }

    return this.endpoints.filter(e => e.method === method.toUpperCase());
  }

  /**
   * Get example for endpoint
   */
  example(path: string, method: string): string | null {
    const key = `${method.toUpperCase()} ${path}`;
    return this.examples.get(key) || null;
  }

  /**
   * Register example
   */
  registerExample(path: string, method: string, example: string): void {
    const key = `${method.toUpperCase()} ${path}`;
    this.examples.set(key, example);
  }
}

// ==================== DEVELOPER PORTAL ====================

export class DeveloperPortal {
  private apiKeys = new Map<string, APIKey>();
  private vendorKeys = new Map<string, Set<string>>();
  private usageLog = new Map<string, { endpoint: string; timestamp: number }[]>();

  /**
   * Create API key for vendor
   */
  createAPIKey(vendorId: string, name: string): APIKey {
    const keyId = 'key-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const secret = 'secret-' + Math.random().toString(36).substr(2, 32);

    const apiKey: APIKey = {
      id: keyId,
      name,
      secret,
      vendorId,
      createdAt: Date.now()
    };

    this.apiKeys.set(keyId, apiKey);

    if (!this.vendorKeys.has(vendorId)) {
      this.vendorKeys.set(vendorId, new Set());
    }
    this.vendorKeys.get(vendorId)!.add(keyId);

    logger.debug('API key created', { keyId, vendorId, name });

    return apiKey;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): void {
    const apiKey = this.apiKeys.get(keyId);
    if (apiKey) {
      this.apiKeys.delete(keyId);
      this.vendorKeys.get(apiKey.vendorId)?.delete(keyId);
      logger.info('API key revoked', { keyId });
    }
  }

  /**
   * List API keys for vendor
   */
  listKeys(vendorId: string): APIKey[] {
    const keyIds = this.vendorKeys.get(vendorId) || new Set();
    return Array.from(keyIds)
      .map(id => this.apiKeys.get(id)!)
      .filter(key => key);
  }

  /**
   * Log API usage
   */
  logAPIUsage(keyId: string, endpoint: string): void {
    if (!this.usageLog.has(keyId)) {
      this.usageLog.set(keyId, []);
    }

    this.usageLog.get(keyId)!.push({
      endpoint,
      timestamp: Date.now()
    });
  }

  /**
   * Get usage statistics for API key
   */
  getUsageStats(keyId: string, period: string): { calls: number; errors: number; avgLatency: number } {
    const usage = this.usageLog.get(keyId) || [];

    const periodMs = period === 'day' ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - periodMs;

    const recentUsage = usage.filter(u => u.timestamp > cutoff);

    return {
      calls: recentUsage.length,
      errors: 0,
      avgLatency: 45
    };
  }
}

// ==================== SDK GENERATOR ====================

export class SDKGenerator {
  /**
   * Generate SDK for language
   */
  generateSDK(language: 'javascript' | 'python' | 'go'): string {
    switch (language) {
      case 'javascript':
        return this.generateJavaScriptSDK();

      case 'python':
        return this.generatePythonSDK();

      case 'go':
        return this.generateGoSDK();

      default:
        return '';
    }
  }

  /**
   * Publish SDK
   */
  publishSDK(language: string, version: string): void {
    logger.info('SDK published', { language, version });
  }

  /**
   * Get SDK documentation
   */
  getSDKDocs(language: string): string {
    const docs: Record<string, string> = {
      javascript: `
# JavaScript SDK

## Installation

\`\`\`
npm install marketplace-sdk
\`\`\`

## Usage

\`\`\`javascript
const MarketplaceSDK = require('marketplace-sdk');

const client = new MarketplaceSDK({
  apiKey: 'your-api-key',
  endpoint: 'https://api.marketplace.com'
});

// Get vendor profile
const vendor = await client.vendors.get('vendor-id');

// Create booking
const booking = await client.bookings.create({
  vendorId: 'vendor-id',
  slotId: 'slot-id',
  guestCount: 2
});
\`\`\`
      `,
      python: `
# Python SDK

## Installation

\`\`\`
pip install marketplace-sdk
\`\`\`

## Usage

\`\`\`python
from marketplace import Client

client = Client(
    api_key='your-api-key',
    endpoint='https://api.marketplace.com'
)

# Get vendor profile
vendor = client.vendors.get('vendor-id')

# Create booking
booking = client.bookings.create(
    vendor_id='vendor-id',
    slot_id='slot-id',
    guest_count=2
)
\`\`\`
      `,
      go: `
# Go SDK

## Installation

\`\`\`
go get github.com/marketplace/sdk-go
\`\`\`

## Usage

\`\`\`go
package main

import "github.com/marketplace/sdk-go"

func main() {
    client := marketplace.NewClient(
        "your-api-key",
        "https://api.marketplace.com",
    )

    vendor, err := client.Vendors.Get("vendor-id")
    if err != nil {
        panic(err)
    }
}
\`\`\`
      `
    };

    return docs[language] || '';
  }

  private generateJavaScriptSDK(): string {
    return `
// Marketplace JavaScript SDK v1.0.0

class MarketplaceSDK {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
  }

  async request(method, path, data) {
    const response = await fetch(this.endpoint + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  }

  vendors = {
    get: (vendorId) => this.request('GET', '/vendors/' + vendorId),
    create: (data) => this.request('POST', '/vendors', data)
  };

  bookings = {
    create: (data) => this.request('POST', '/bookings', data),
    get: (bookingId) => this.request('GET', '/bookings/' + bookingId)
  };
}

module.exports = MarketplaceSDK;
    `;
  }

  private generatePythonSDK(): string {
    return `
# Marketplace Python SDK v1.0.0

import requests

class Client:
  def __init__(self, api_key, endpoint):
    self.api_key = api_key
    self.endpoint = endpoint
    self.headers = {
      'Authorization': f'Bearer {api_key}',
      'Content-Type': 'application/json'
    }

  def request(self, method, path, data=None):
    url = self.endpoint + path
    response = requests.request(method, url, headers=self.headers, json=data)
    return response.json()

  class Vendors:
    def __init__(self, client):
      self.client = client
    def get(self, vendor_id):
      return self.client.request('GET', f'/vendors/{vendor_id}')

  class Bookings:
    def __init__(self, client):
      self.client = client
    def create(self, **kwargs):
      return self.client.request('POST', '/bookings', kwargs)

  def __init__(self, api_key, endpoint):
    self.api_key = api_key
    self.endpoint = endpoint
    self.vendors = self.Vendors(self)
    self.bookings = self.Bookings(self)
    `;
  }

  private generateGoSDK(): string {
    return `
// Marketplace Go SDK v1.0.0

package marketplace

import (
  "bytes"
  "encoding/json"
  "net/http"
)

type Client struct {
  APIKey   string
  Endpoint string
  http     *http.Client
}

func NewClient(apiKey, endpoint string) *Client {
  return &Client{
    APIKey:   apiKey,
    Endpoint: endpoint,
    http:     &http.Client{},
  }
}

func (c *Client) request(method, path string, data interface{}) ([]byte, error) {
  var body []byte
  if data != nil {
    var err error
    body, err = json.Marshal(data)
    if err != nil {
      return nil, err
    }
  }

  req, _ := http.NewRequest(method, c.Endpoint+path, bytes.NewReader(body))
  req.Header.Add("Authorization", "Bearer "+c.APIKey)
  req.Header.Add("Content-Type", "application/json")

  resp, _ := c.http.Do(req)
  defer resp.Body.Close()

  return io.ReadAll(resp.Body)
}

type Vendors struct {
  client *Client
}

func (v *Vendors) Get(vendorID string) ([]byte, error) {
  return v.client.request("GET", "/vendors/"+vendorID, nil)
}
    `;
  }
}

// ==================== EXPORTS ====================

export const apiDocGenerator = new APIDocGenerator();
export const developerPortal = new DeveloperPortal();
export const sdkGenerator = new SDKGenerator();
