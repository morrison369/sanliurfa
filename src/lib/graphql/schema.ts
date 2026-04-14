/**
 * GraphQL Schema Definition
 * Type definitions for Şanlıurfa API
 */

export const typeDefinitions = `
  scalar DateTime
  scalar JSON

  enum SortOrder {
    ASC
    DESC
  }

  enum PlaceStatus {
    ACTIVE
    PENDING
    REJECTED
    DELETED
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }

  type User {
    id: ID!
    email: String!
    fullName: String!
    avatarUrl: String
    bio: String
    isVerified: Boolean!
    isLocalGuide: Boolean!
    createdAt: DateTime!
    places: [Place!]!
    reviews: [Review!]!
    collections: [Collection!]!
    followerCount: Int!
    followingCount: Int!
  }

  type Place {
    id: ID!
    name: String!
    description: String!
    category: Category!
    address: String!
    latitude: Float!
    longitude: Float!
    rating: Float!
    reviewCount: Int!
    images: [String!]!
    status: PlaceStatus!
    amenities: [String!]!
    openingHours: [OpeningHour!]
    reviews(limit: Int, offset: Int): ReviewConnection!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PlaceEdge {
    node: Place!
    cursor: String!
  }

  type PlaceConnection {
    edges: [PlaceEdge!]!
    pageInfo: PageInfo!
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    icon: String
    description: String
    placeCount: Int!
  }

  type Review {
    id: ID!
    place: Place!
    user: User!
    rating: Int!
    title: String
    comment: String!
    photos: [String!]!
    helpfulCount: Int!
    isVerified: Boolean!
    visitDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ReviewEdge {
    node: Review!
    cursor: String!
  }

  type ReviewConnection {
    edges: [ReviewEdge!]!
    pageInfo: PageInfo!
  }

  type Collection {
    id: ID!
    name: String!
    description: String
    isPublic: Boolean!
    coverImage: String
    placeCount: Int!
    places: [Place!]!
    createdBy: User!
    createdAt: DateTime!
  }

  type OpeningHour {
    dayOfWeek: Int!
    openTime: String!
    closeTime: String!
    isClosed: Boolean!
  }

  type SearchResult {
    places: [Place!]!
    totalCount: Int!
    facets: SearchFacets!
  }

  type SearchFacets {
    categories: [FacetCount!]!
    ratings: [FacetCount!]!
  }

  type FacetCount {
    key: String!
    count: Int!
  }

  type Activity {
    id: ID!
    type: String!
    user: User!
    entityType: String
    entityId: String
    createdAt: DateTime!
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    message: String!
    isRead: Boolean!
    data: JSON
    createdAt: DateTime!
  }

  type SubscriptionPlan {
    id: ID!
    name: String!
    description: String!
    priceMonthly: Float!
    priceYearly: Float!
    features: [String!]!
  }

  input PlaceInput {
    name: String!
    description: String!
    categoryId: ID!
    address: String!
    latitude: Float!
    longitude: Float!
    amenities: [String!]
    images: [String!]
  }

  input ReviewInput {
    placeId: ID!
    rating: Int!
    title: String
    comment: String!
    photos: [String!]
  }

  input CollectionInput {
    name: String!
    description: String
    isPublic: Boolean
    tags: [String!]
  }

  input PlaceFilter {
    categoryId: ID
    minRating: Float
    maxRating: Float
    status: PlaceStatus
    near: LocationInput
    tags: [String!]
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
    radius: Float! # in meters
  }

  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!

    # Place queries
    place(id: ID!): Place
    places(
      filter: PlaceFilter
      sortBy: String
      sortOrder: SortOrder
      pagination: PaginationInput
    ): PlaceConnection!
    placesByCategory(categoryId: ID!, limit: Int): [Place!]!
    nearbyPlaces(location: LocationInput!, limit: Int): [Place!]!

    # Category queries
    categories: [Category!]!
    category(id: ID!): Category

    # Review queries
    review(id: ID!): Review
    placeReviews(placeId: ID!, limit: Int, offset: Int): ReviewConnection!
    userReviews(userId: ID!, limit: Int): [Review!]!

    # Collection queries
    collection(id: ID!): Collection
    userCollections(userId: ID!, includePrivate: Boolean): [Collection!]!

    # Search
    search(query: String!, filter: PlaceFilter, limit: Int): SearchResult!
    autocomplete(query: String!, limit: Int): [String!]!

    # Activity
    activityFeed(limit: Int): [Activity!]!

    # Notifications
    notifications(unreadOnly: Boolean): [Notification!]!
    unreadNotificationCount: Int!

    # Subscription
    subscriptionPlans: [SubscriptionPlan!]!
    mySubscription: SubscriptionPlan
  }

  type Mutation {
    # Auth mutations
    register(email: String!, password: String!, fullName: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    updateProfile(input: UpdateProfileInput!): User!

    # Place mutations
    createPlace(input: PlaceInput!): Place!
    updatePlace(id: ID!, input: PlaceInput!): Place!
    deletePlace(id: ID!): Boolean!
    uploadPlaceImage(placeId: ID!, image: Upload!): String!

    # Review mutations
    createReview(input: ReviewInput!): Review!
    updateReview(id: ID!, input: ReviewInput!): Review!
    deleteReview(id: ID!): Boolean!
    markReviewHelpful(id: ID!): Boolean!

    # Collection mutations
    createCollection(input: CollectionInput!): Collection!
    updateCollection(id: ID!, input: CollectionInput!): Collection!
    deleteCollection(id: ID!): Boolean!
    addToCollection(collectionId: ID!, placeId: ID!): Boolean!
    removeFromCollection(collectionId: ID!, placeId: ID!): Boolean!

    # Social mutations
    followUser(userId: ID!): Boolean!
    unfollowUser(userId: ID!): Boolean!

    # Notification mutations
    markNotificationRead(id: ID!): Boolean!
    markAllNotificationsRead: Boolean!

    # Subscription mutations
    subscribe(planId: ID!, billingCycle: String!): Subscription!
    cancelSubscription: Boolean!
  }

  type Subscription {
    # Real-time subscriptions
    newReview(placeId: ID): Review!
    newActivity: Activity!
    newNotification: Notification!
    placeStatusChanged(placeId: ID): Place!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input UpdateProfileInput {
    fullName: String
    bio: String
    avatarUrl: String
  }

  scalar Upload
`;

// Resolvers will be in separate file
export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) return null;
      return context.user;
    },
    
    user: async (_: any, { id }: { id: string }, { db }: any) => {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    },

    place: async (_: any, { id }: { id: string }, { db }: any) => {
      const result = await db.query('SELECT * FROM places WHERE id = $1', [id]);
      return result.rows[0];
    },

    places: async (_: any, args: any, { db }: any) => {
      const { filter, sortBy = 'created_at', sortOrder = 'DESC', pagination } = args;
      
      let sql = 'SELECT * FROM places WHERE status = $1';
      const params: any[] = ['active'];

      if (filter?.categoryId) {
        sql += ` AND category_id = $${params.length + 1}`;
        params.push(filter.categoryId);
      }

      if (filter?.minRating) {
        sql += ` AND rating >= $${params.length + 1}`;
        params.push(filter.minRating);
      }

      sql += ` ORDER BY ${sortBy} ${sortOrder}`;

      if (pagination?.first) {
        sql += ` LIMIT $${params.length + 1}`;
        params.push(pagination.first);
      }

      const result = await db.query(sql, params);
      
      return {
        edges: result.rows.map((place: any) => ({
          node: place,
          cursor: Buffer.from(place.id).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: result.rows.length === (pagination?.first || 20),
          hasPreviousPage: !!pagination?.after,
          totalCount: result.rows.length,
        },
      };
    },

    categories: async (_: any, __: any, { db }: any) => {
      const result = await db.query('SELECT * FROM categories ORDER BY name');
      return result.rows;
    },

    search: async (_: any, { query, filter, limit = 20 }: any, { db }: any) => {
      const searchQuery = `%${query}%`;
      const result = await db.query(
        `SELECT * FROM places 
        WHERE (name ILIKE $1 OR description ILIKE $1) 
        AND status = 'active'
        LIMIT $2`,
        [searchQuery, limit]
      );

      return {
        places: result.rows,
        totalCount: result.rows.length,
        facets: {
          categories: [],
          ratings: [],
        },
      };
    },

    autocomplete: async (_: any, { query, limit = 10 }: any, { db }: any) => {
      const searchQuery = `%${query}%`;
      const result = await db.query(
        `SELECT name FROM places 
        WHERE name ILIKE $1 AND status = 'active'
        UNION
        SELECT name FROM categories WHERE name ILIKE $1
        LIMIT $2`,
        [searchQuery, limit]
      );
      return result.rows.map((r: any) => r.name);
    },
  },

  Mutation: {
    register: async (_: any, { email, password, fullName }: any, { auth }: any) => {
      // Registration logic
      return { token: 'jwt_token', user: { id: '1', email, fullName } };
    },

    createPlace: async (_: any, { input }: any, { db, user }: any) => {
      if (!user) throw new Error('Authentication required');
      
      const result = await db.query(
        `INSERT INTO places (name, description, category_id, address, latitude, longitude, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [input.name, input.description, input.categoryId, input.address, 
         input.latitude, input.longitude, user.id]
      );
      
      return result.rows[0];
    },

    createReview: async (_: any, { input }: any, { db, user }: any) => {
      if (!user) throw new Error('Authentication required');
      
      const result = await db.query(
        `INSERT INTO reviews (place_id, user_id, rating, title, comment)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.placeId, user.id, input.rating, input.title, input.comment]
      );
      
      return result.rows[0];
    },
  },

  Place: {
    reviews: async (parent: any, { limit = 10, offset = 0 }: any, { db }: any) => {
      const result = await db.query(
        'SELECT * FROM reviews WHERE place_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [parent.id, limit, offset]
      );
      return {
        edges: result.rows.map((r: any) => ({ node: r, cursor: r.id })),
        pageInfo: { hasNextPage: result.rows.length === limit, totalCount: result.rows.length },
      };
    },
    
    category: async (parent: any, _: any, { db }: any) => {
      const result = await db.query('SELECT * FROM categories WHERE id = $1', [parent.category_id]);
      return result.rows[0];
    },
  },

  User: {
    places: async (parent: any, _: any, { db }: any) => {
      const result = await db.query('SELECT * FROM places WHERE created_by = $1', [parent.id]);
      return result.rows;
    },
    
    reviews: async (parent: any, _: any, { db }: any) => {
      const result = await db.query('SELECT * FROM reviews WHERE user_id = $1', [parent.id]);
      return result.rows;
    },
  },

  DateTime: {
    serialize(value: any) {
      return value instanceof Date ? value.toISOString() : value;
    },
    parseValue(value: any) {
      return new Date(value);
    },
    parseLiteral(ast: any) {
      return new Date(ast.value);
    },
  },
};
