/**
 * GraphQL Federation Gateway
 * Task 141: Microservices GraphQL Federation
 */

import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';

// Service definitions
const SERVICE_DEFINITIONS = [
  { name: 'users', url: process.env.USER_SERVICE_URL || 'http://localhost:4001/graphql' },
  { name: 'places', url: process.env.PLACE_SERVICE_URL || 'http://localhost:4002/graphql' },
  { name: 'reviews', url: process.env.REVIEW_SERVICE_URL || 'http://localhost:4003/graphql' },
  { name: 'bookings', url: process.env.BOOKING_SERVICE_URL || 'http://localhost:4004/graphql' },
  { name: 'payments', url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4005/graphql' },
];

// Custom data source with auth forwarding
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  async willSendRequest({ request, context }: any) {
    // Forward auth token
    if (context.token) {
      request.http.headers.set('authorization', context.token);
    }
    // Forward request ID for tracing
    if (context.requestId) {
      request.http.headers.set('x-request-id', context.requestId);
    }
  }
}

/**
 * Create federation gateway
 */
export function createGateway(): ApolloGateway {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: SERVICE_DEFINITIONS,
      pollIntervalInMs: 30000, // Poll for schema changes every 30s
    }),
    buildService({ name, url }) {
      return new AuthenticatedDataSource({ url });
    },
    // Circuit breaker pattern
    experimental_approximateQueryPlanStore: undefined,
  });

  // Health check
  gateway.onSchemaLoadOrUpdate((schemaContext) => {
    console.log('[Gateway] Schema updated');
  });

  gateway.onSchemaChange((schemaContext) => {
    console.log('[Gateway] Schema changed');
  });

  return gateway;
}

/**
 * Create federated Apollo Server
 */
export async function createFederatedServer(): Promise<ApolloServer> {
  const gateway = createGateway();

  const server = new ApolloServer({
    gateway,
    subscriptions: false,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              // Query complexity analysis
              const complexity = calculateComplexity(requestContext.operation);
              if (complexity > 1000) {
                throw new Error('Query too complex');
              }
            },
          };
        },
      },
    ],
    context: async ({ req }) => {
      return {
        token: req.headers.authorization,
        requestId: req.headers['x-request-id'] || generateId(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
    },
  });

  await server.start();
  return server;
}

/**
 * Query complexity calculator
 */
function calculateComplexity(operation: any): number {
  let complexity = 0;
  
  function countFields(selectionSet: any, depth: number = 0): number {
    if (!selectionSet?.selections) return 0;
    
    let count = 0;
    for (const selection of selectionSet.selections) {
      count += 1 + depth * 2;
      if (selection.selectionSet) {
        count += countFields(selection.selectionSet, depth + 1);
      }
    }
    return count;
  }

  if (operation?.selectionSet) {
    complexity = countFields(operation.selectionSet);
  }

  return complexity;
}

/**
 * Schema stitching for local development
 */
export function createLocalSchema(): any {
  // For development without all services
  return {
    typeDefs: `
      type Query {
        _service: Service!
      }
      type Service {
        sdl: String!
      }
    `,
    resolvers: {
      Query: {
        _service: () => ({ sdl: 'type Query { _empty: String }' }),
      },
    },
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
