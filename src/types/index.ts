export interface WardrobeItem {
  id: string
  user_id: string
  image_url: string | null
  category: string
  subcategory: string | null
  colors: string[]
  style_tags: string[]
  brand: string | null
  description: string | null
  created_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  source_url: string
  source: 'pinterest' | 'amazon' | 'manual' | 'other'
  image_url: string | null
  title: string
  price: number | null
  currency: string
  style_tags: string[]
  colors: string[]
  category: string | null
  created_at: string
}

export interface StyleProfile {
  id: string
  user_id: string
  dominant_styles: string[]
  color_palette: string[]
  preferred_categories: string[]
  budget_min: number | null
  budget_max: number | null
  updated_at: string
}

export interface Recommendation {
  id: string
  user_id: string
  title: string
  description: string
  reason: string          // why AI recommends it
  outfits_unlocked: number // how many existing outfits this completes
  category: string
  style_tags: string[]
  colors: string[]
  image_url: string | null
  deal_url: string | null
  deal_price: number | null
  deal_source: string | null
  score: number           // 0-100
  created_at: string
}

export interface GeminiWardrobeAnalysis {
  category: string
  subcategory: string
  colors: string[]
  style_tags: string[]
  brand: string | null
  description: string
}

export interface GeminiRecommendation {
  title: string
  description: string
  reason: string
  outfits_unlocked: number
  category: string
  style_tags: string[]
  colors: string[]
  search_query: string  // used to find deals
  score: number
}
