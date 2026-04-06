// User Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'moderator';
  points: number;
  created_at: string;
  last_login?: string;
}

// Place Types
export interface Place {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: PlaceCategory;
  subcategory?: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude: number;
  longitude: number;
  images: string[];
  cover_image?: string;
  rating: number;
  review_count: number;
  price_range?: 1 | 2 | 3 | 4 | 5;
  opening_hours?: OpeningHours;
  amenities: string[];
  tags: string[];
  is_featured: boolean;
  is_verified: boolean;
  status: 'active' | 'pending' | 'inactive';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type PlaceCategory = 
  | 'restaurant' 
  | 'cafe' 
  | 'hotel' 
  | 'museum' 
  | 'historical' 
  | 'park' 
  | 'shopping' 
  | 'entertainment' 
  | 'health' 
  | 'education'
  | 'transportation';

export interface OpeningHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

// Review Types
export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  user?: User;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  likes: number;
  is_verified: boolean;
  visit_date?: string;
  created_at: string;
  updated_at: string;
}

// Historical Site Types
export interface HistoricalSite {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  short_description: string;
  history: string;
  significance: string;
  location: string;
  latitude: number;
  longitude: number;
  images: string[];
  cover_image: string;
  gallery: string[];
  visiting_hours: string;
  entrance_fee?: string;
  tips: string[];
  nearby_places: string[];
  tags: string[];
  is_unesco: boolean;
  period?: string;
  created_at: string;
  updated_at: string;
}

// Food Types
export interface Food {
  id: string;
  slug: string;
  name: string;
  description: string;
  history: string;
  ingredients: string[];
  where_to_eat: string[];
  images: string[];
  cover_image: string;
  tags: string[];
  is_vegetarian: boolean;
  is_spicy: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time?: string;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

// Blog Types
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: User;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  is_featured: boolean;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Event Types
export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  start_date: string;
  end_date: string;
  image: string;
  category: string;
  is_free: boolean;
  price?: string;
  organizer: string;
  contact?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Weather Types
export interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    description: string;
    icon: string;
    uv_index: number;
    visibility: number;
  };
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  precipitation_chance: number;
}

// Search Types
export interface SearchResult {
  type: 'place' | 'historical' | 'food' | 'blog' | 'event';
  id: string;
  title: string;
  description: string;
  image?: string;
  url: string;
}

// Points System
export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string;
  reference_id?: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  badge_id: string;
  badge: Badge;
  earned_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  points_reward: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
