/**
 * GraphQL Subgraph Helper
 * For individual microservices
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';

export interface SubgraphConfig {
  name: string;
  typeDefs: string;
  resolvers: any;
  port: number;
}

/**
 * Create subgraph schema with federation directives
 */
export function createSubgraph(config: SubgraphConfig) {
  const typeDefs = gql(config.typeDefs);
  
  const schema = buildSubgraphSchema([
    {
      typeDefs,
      resolvers: config.resolvers,
    },
  ]);

  return {
    schema,
    name: config.name,
    port: config.port,
  };
}

// Example subgraph schemas
export const USER_SUBGRAPH = `
  extend type Query {
    user(id: ID!): User
    users: [User!]!
    me: User
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    fullName: String!
    avatar: String
    createdAt: String!
  }
`;

export const PLACE_SUBGRAPH = `
  extend type Query {
    place(id: ID!): Place
    places(filter: PlaceFilter): [Place!]!
    placesNear(location: LocationInput!, radius: Float): [Place!]!
  }

  type Place @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    category: String!
    location: Location!
    rating: Float!
    reviewCount: Int!
    owner: User! @provides(fields: "id")
  }

  type Location {
    lat: Float!
    lng: Float!
    address: String!
  }

  input LocationInput {
    lat: Float!
    lng: Float!
  }

  input PlaceFilter {
    category: String
    minRating: Float
    maxPrice: Int
  }
`;

export const REVIEW_SUBGRAPH = `
  extend type Query {
    review(id: ID!): Review
    reviews(placeId: ID!): [Review!]!
    myReviews: [Review!]!
  }

  type Review @key(fields: "id") {
    id: ID!
    place: Place! @provides(fields: "id")
    author: User! @provides(fields: "id")
    rating: Int!
    content: String!
    photos: [String!]!
    helpful: Int!
    createdAt: String!
  }

  extend type Place @key(fields: "id") {
    reviews: [Review!]! @requires(fields: "id")
  }

  extend type User @key(fields: "id") {
    reviews: [Review!]! @requires(fields: "id")
  }
`;
