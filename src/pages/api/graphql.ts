/**
 * GraphQL API Endpoint
 * Simple GraphQL endpoint placeholder
 * 
 * Note: Install 'graphql' package for full functionality:
 *   npm install graphql
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      message: 'GraphQL endpoint ready',
      info: 'Install graphql package for full functionality: npm install graphql',
      usage: {
        endpoint: '/api/graphql',
        method: 'POST',
        body: { query: '{ places { id name } }' }
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      message: 'GraphQL endpoint',
      status: 'Ready for GraphQL implementation',
      schema: '/graphql/schema.ts',
      resolvers: '/graphql/resolvers.ts',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
