export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: 'user' | 'admin' | 'moderator'
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'moderator'
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'moderator'
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
      places: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          category: string
          subcategory: string | null
          address: string
          phone: string | null
          email: string | null
          website: string | null
          latitude: number
          longitude: number
          images: string[]
          cover_image: string | null
          rating: number
          review_count: number
          price_range: number | null
          opening_hours: Json | null
          amenities: string[]
          tags: string[]
          is_featured: boolean
          is_verified: boolean
          status: 'active' | 'pending' | 'inactive'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          category: string
          subcategory?: string | null
          address: string
          phone?: string | null
          email?: string | null
          website?: string | null
          latitude: number
          longitude: number
          images?: string[]
          cover_image?: string | null
          rating?: number
          review_count?: number
          price_range?: number | null
          opening_hours?: Json | null
          amenities?: string[]
          tags?: string[]
          is_featured?: boolean
          is_verified?: boolean
          status?: 'active' | 'pending' | 'inactive'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          category?: string
          subcategory?: string | null
          address?: string
          phone?: string | null
          email?: string | null
          website?: string | null
          latitude?: number
          longitude?: number
          images?: string[]
          cover_image?: string | null
          rating?: number
          review_count?: number
          price_range?: number | null
          opening_hours?: Json | null
          amenities?: string[]
          tags?: string[]
          is_featured?: boolean
          is_verified?: boolean
          status?: 'active' | 'pending' | 'inactive'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          place_id: string
          user_id: string
          rating: number
          title: string | null
          content: string
          images: string[] | null
          likes: number
          is_verified: boolean
          visit_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          place_id: string
          user_id: string
          rating: number
          title?: string | null
          content: string
          images?: string[] | null
          likes?: number
          is_verified?: boolean
          visit_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          place_id?: string
          user_id?: string
          rating?: number
          title?: string | null
          content?: string
          images?: string[] | null
          likes?: number
          is_verified?: boolean
          visit_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      historical_sites: {
        Row: {
          id: string
          slug: string
          name: string
          title: string
          description: string
          short_description: string
          history: string
          significance: string
          location: string
          latitude: number
          longitude: number
          images: string[]
          cover_image: string
          gallery: string[]
          visiting_hours: string
          entrance_fee: string | null
          tips: string[]
          nearby_places: string[]
          tags: string[]
          is_unesco: boolean
          period: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          title: string
          description: string
          short_description: string
          history: string
          significance: string
          location: string
          latitude: number
          longitude: number
          images?: string[]
          cover_image: string
          gallery?: string[]
          visiting_hours: string
          entrance_fee?: string | null
          tips?: string[]
          nearby_places?: string[]
          tags?: string[]
          is_unesco?: boolean
          period?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          title?: string
          description?: string
          short_description?: string
          history?: string
          significance?: string
          location?: string
          latitude?: number
          longitude?: number
          images?: string[]
          cover_image?: string
          gallery?: string[]
          visiting_hours?: string
          entrance_fee?: string | null
          tips?: string[]
          nearby_places?: string[]
          tags?: string[]
          is_unesco?: boolean
          period?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      foods: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          history: string
          ingredients: string[]
          where_to_eat: string[]
          images: string[]
          cover_image: string
          tags: string[]
          is_vegetarian: boolean
          is_spicy: boolean
          difficulty: 'easy' | 'medium' | 'hard'
          prep_time: string | null
          rating: number
          review_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          history: string
          ingredients?: string[]
          where_to_eat?: string[]
          images?: string[]
          cover_image: string
          tags?: string[]
          is_vegetarian?: boolean
          is_spicy?: boolean
          difficulty?: 'easy' | 'medium' | 'hard'
          prep_time?: string | null
          rating?: number
          review_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          history?: string
          ingredients?: string[]
          where_to_eat?: string[]
          images?: string[]
          cover_image?: string
          tags?: string[]
          is_vegetarian?: boolean
          is_spicy?: boolean
          difficulty?: 'easy' | 'medium' | 'hard'
          prep_time?: string | null
          rating?: number
          review_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string
          content: string
          cover_image: string
          author_id: string
          category: string
          tags: string[]
          views: number
          likes: number
          is_featured: boolean
          is_published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt: string
          content: string
          cover_image: string
          author_id: string
          category: string
          tags?: string[]
          views?: number
          likes?: number
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string
          content?: string
          cover_image?: string
          author_id?: string
          category?: string
          tags?: string[]
          views?: number
          likes?: number
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          location: string
          latitude: number | null
          longitude: number | null
          start_date: string
          end_date: string
          image: string
          category: string
          is_free: boolean
          price: string | null
          organizer: string
          contact: string | null
          status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description: string
          location: string
          latitude?: number | null
          longitude?: number | null
          start_date: string
          end_date: string
          image: string
          category: string
          is_free?: boolean
          price?: string | null
          organizer: string
          contact?: string | null
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          location?: string
          latitude?: number | null
          longitude?: number | null
          start_date?: string
          end_date?: string
          image?: string
          category?: string
          is_free?: boolean
          price?: string | null
          organizer?: string
          contact?: string | null
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      points_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'earn' | 'spend'
          reason: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'earn' | 'spend'
          reason: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'earn' | 'spend'
          reason?: string
          reference_id?: string | null
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          place_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          place_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          place_id?: string
          created_at?: string
        }
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          status: 'active' | 'unsubscribed'
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          id?: string
          email: string
          status?: 'active' | 'unsubscribed'
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          status?: 'active' | 'unsubscribed'
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
