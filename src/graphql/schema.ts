/**
 * GraphQL Schema
 * Type definitions for GraphQL API
 */

export const typeDefs = `
  scalar DateTime
  scalar JSON

  enum SortOrder {
    ASC
    DESC
  }

  enum PlaceStatus {
    ACTIVE
    INACTIVE
    PENDING
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
    avatar: String
    role: String!
    bio: String
    location: String
    website: String
    isVerified: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relations
    reviews: [Review!]!
    favorites: [Place!]!
    reviewCount: Int!
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    icon: String
    image: String
    parent: Category
    children: [Category!]!
    placeCount: Int!
  }

  type Tag {
    id: ID!
    name: String!
    slug: String!
  }

  type Place {
    id: ID!
    name: String!
    slug: String!
    description: String!
    shortDescription: String
    category: Category!
    tags: [Tag!]!
    
    # Location
    address: String!
    latitude: Float!
    longitude: Float!
    city: String!
    country: String!
    
    # Contact
    phone: String
    email: String
    website: String
    
    # Media
    images: [String!]!
    coverImage: String
    
    # Ratings
    rating: Float!
    reviewCount: Int!
    
    # Details
    priceRange: String
    currency: String
    openingHours: [OpeningHours!]!
    amenities: [String!]!
    
    # Status
    status: PlaceStatus!
    isFeatured: Boolean!
    isVerified: Boolean!
    
    # Relations
    reviews(limit: Int = 10, offset: Int = 0): [Review!]!
    owner: User
    
    # Meta
    viewCount: Int!
    favoriteCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Computed
    isOpenNow: Boolean!
    distance(lat: Float!, lng: Float!): Float
  }

  type OpeningHours {
    day: Int! # 0-6 (Sunday-Saturday)
    dayName: String!
    opens: String! # HH:mm format
    closes: String!
    isOpen: Boolean!
  }

  type Review {
    id: ID!
    place: Place!
    author: User!
    rating: Int!
    title: String
    content: String!
    images: [String!]!
    helpful: Int!
    
    # Meta
    isVerified: Boolean!
    status: String!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BlogPost {
    id: ID!
    title: String!
    slug: String!
    excerpt: String!
    content: String!
    featuredImage: String
    
    # Relations
    author: User!
    category: Category!
    tags: [Tag!]!
    
    # Meta
    readTime: Int!
    viewCount: Int!
    likeCount: Int!
    
    # Status
    isPublished: Boolean!
    publishedAt: DateTime
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SearchResult {
    places: [Place!]!
    posts: [BlogPost!]!
    totalPlaces: Int!
    totalPosts: Int!
    facets: SearchFacets!
  }

  type SearchFacets {
    categories: [FacetCount!]!
    tags: [FacetCount!]!
    priceRanges: [FacetCount!]!
  }

  type FacetCount {
    value: String!
    count: Int!
  }

  type Recommendation {
    place: Place!
    score: Float!
    reason: String!
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    message: String!
    data: JSON
    isRead: Boolean!
    createdAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
    expiresAt: DateTime!
  }

  # Input types
  input CreatePlaceInput {
    name: String!
    description: String!
    categoryId: ID!
    address: String!
    latitude: Float!
    longitude: Float!
    phone: String
    email: String
    website: String
    priceRange: String
    tags: [String!]
  }

  input UpdatePlaceInput {
    name: String
    description: String
    categoryId: ID
    address: String
    phone: String
    email: String
    website: String
    priceRange: String
  }

  input CreateReviewInput {
    placeId: ID!
    rating: Int!
    title: String
    content: String!
    images: [String!]
  }

  input PlaceFilter {
    categoryId: ID
    tags: [String!]
    priceRange: [String!]
    rating: Int
    status: PlaceStatus
    isFeatured: Boolean
    near: GeoFilter
  }

  input GeoFilter {
    lat: Float!
    lng: Float!
    radius: Float! # in km
  }

  input SortInput {
    field: String!
    order: SortOrder!
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    
    # Place queries
    place(id: ID!, slug: String): Place
    places(
      filter: PlaceFilter
      sort: SortInput
      limit: Int = 20
      offset: Int = 0
    ): [Place!]!
    placesConnection(
      filter: PlaceFilter
      sort: SortInput
      first: Int
      after: String
      last: Int
      before: String
    ): PlaceConnection!
    featuredPlaces(limit: Int = 10): [Place!]!
    nearbyPlaces(lat: Float!, lng: Float!, radius: Float = 5, limit: Int = 10): [Place!]!
    
    # Category queries
    categories: [Category!]!
    category(id: ID!, slug: String): Category
    
    # Review queries
    reviews(
      placeId: ID
      userId: ID
      limit: Int = 20
      offset: Int = 0
    ): [Review!]!
    
    # Blog queries
    blogPosts(
      categoryId: ID
      tag: String
      limit: Int = 20
      offset: Int = 0
    ): [BlogPost!]!
    blogPost(id: ID, slug: String): BlogPost
    
    # Search
    search(
      query: String!
      filters: PlaceFilter
      limit: Int = 20
      offset: Int = 0
    ): SearchResult!
    autocomplete(query: String!, limit: Int = 5): [String!]!
    
    # Recommendations
    recommendations(limit: Int = 10): [Recommendation!]!
    similarPlaces(placeId: ID!, limit: Int = 5): [Recommendation!]!
    
    # Notifications
    notifications(limit: Int = 20, offset: Int = 0): [Notification!]!
    unreadNotificationCount: Int!
  }

  type PlaceConnection {
    edges: [PlaceEdge!]!
    pageInfo: PageInfo!
  }

  type PlaceEdge {
    node: Place!
    cursor: String!
  }

  # Mutations
  type Mutation {
    # Auth mutations
    register(email: String!, password: String!, fullName: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    
    # User mutations
    updateProfile(input: JSON!): User!
    uploadAvatar(file: String!): User!
    
    # Place mutations
    createPlace(input: CreatePlaceInput!): Place!
    updatePlace(id: ID!, input: UpdatePlaceInput!): Place!
    deletePlace(id: ID!): Boolean!
    claimPlace(id: ID!): Boolean!
    
    # Review mutations
    createReview(input: CreateReviewInput!): Review!
    updateReview(id: ID!, input: CreateReviewInput!): Review!
    deleteReview(id: ID!): Boolean!
    markReviewHelpful(id: ID!): Boolean!
    
    # Favorite mutations
    addToFavorites(placeId: ID!): Boolean!
    removeFromFavorites(placeId: ID!): Boolean!
    
    # Notification mutations
    markNotificationRead(id: ID!): Boolean!
    markAllNotificationsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    # Real-time updates
    placeUpdated(id: ID!): Place!
    reviewAdded(placeId: ID!): Review!
    newNotification: Notification!
    
    # Live features
    userTyping(placeId: ID!): User!
  }
`;

export default typeDefs;
