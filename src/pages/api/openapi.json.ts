import type { APIRoute } from 'astro';

const openApiSpec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Şanlıurfa.com API",
    "description": "City guide and social platform API with webhooks, messaging, and analytics",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "https://sanliurfa.com" },
    { "url": "http://localhost:4321" }
  ],
  "tags": [
    { "name": "Webhooks", "description": "Webhook management and testing" },
    { "name": "Health", "description": "System health checks" },
    { "name": "Auth", "description": "Authentication" }
  ],
  "paths": {
    "/api/webhooks": {
      "get": {
        "tags": ["Webhooks"],
        "summary": "List user webhooks",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "List of webhooks",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string", "format": "uuid" },
                          "event": { "type": "string" },
                          "url": { "type": "string", "format": "uri" },
                          "active": { "type": "boolean" },
                          "createdAt": { "type": "string", "format": "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { "description": "Unauthorized" }
        }
      },
      "post": {
        "tags": ["Webhooks"],
        "summary": "Register new webhook",
        "security": [{ "BearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["event", "url"],
                "properties": {
                  "event": { "type": "string", "example": "place.created" },
                  "url": { "type": "string", "format": "uri" },
                  "secret": { "type": "string", "description": "Optional secret for HMAC signature" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Webhook created" },
          "400": { "description": "Validation error" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/webhooks/{id}": {
      "delete": {
        "tags": ["Webhooks"],
        "summary": "Delete webhook",
        "security": [{ "BearerAuth": [] }],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": { "description": "Webhook deleted" },
          "404": { "description": "Webhook not found" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/webhooks/analytics": {
      "get": {
        "tags": ["Webhooks"],
        "summary": "Get webhook analytics and metrics",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Webhook metrics",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "totalWebhooks": { "type": "integer" },
                        "totalEvents": { "type": "integer" },
                        "deliveredEvents": { "type": "integer" },
                        "failedEvents": { "type": "integer" },
                        "pendingEvents": { "type": "integer" },
                        "successRate": { "type": "number" }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/webhooks/test": {
      "post": {
        "tags": ["Webhooks"],
        "summary": "Test webhook with sample event",
        "security": [{ "BearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["webhookId"],
                "properties": {
                  "webhookId": { "type": "string", "format": "uuid" },
                  "testData": { "type": "object", "description": "Optional test payload" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Test webhook sent" },
          "404": { "description": "Webhook not found" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/webhooks/retry": {
      "post": {
        "tags": ["Webhooks"],
        "summary": "Retry failed webhook events",
        "security": [{ "BearerAuth": [] }],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "eventId": { "type": "string", "format": "uuid", "description": "Retry specific event" },
                  "webhookId": { "type": "string", "format": "uuid", "description": "Retry all failed for webhook" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Events queued for retry" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/health": {
      "get": {
        "tags": ["Health"],
        "summary": "Health check",
        "responses": {
          "200": { "description": "System healthy" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(openApiSpec), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
