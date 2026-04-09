/**
 * Fashion image fetching — priority chain:
 * 1. SerpAPI Google Images (best relevance — reuses existing SERPAPI_KEY)
 * 2. Pexels (high quality stock — needs PEXELS_API_KEY)
 * 3. Openverse CC (free fallback, no key needed, quality varies)
 */

export async function fetchFashionImage(query: string): Promise<string | null> {
  const serpKey = process.env.SERPAPI_KEY
  if (serpKey) {
    const url = await fromSerpAPI(query, serpKey)
    if (url) return url
  }

  const pexelsKey = process.env.PEXELS_API_KEY
  if (pexelsKey) {
    const url = await fromPexels(query, pexelsKey)
    if (url) return url
  }

  return fromOpenverse(query)
}

async function fromSerpAPI(query: string, key: string): Promise<string | null> {
  // Try Google Shopping first — always returns clean product shots on white/plain backgrounds
  const shopping = await fromSerpAPIShopping(query, key)
  if (shopping) return shopping

  // Fall back to Google Images with "product photo" bias
  try {
    const params = new URLSearchParams({
      engine: 'google_images',
      q: `${query} product photo`,
      api_key: key,
      num: '5',
      safe: 'active',
    })
    const res = await fetch(`https://serpapi.com/search?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const results: Array<{ original: string; thumbnail: string }> = data.images_results ?? []
    if (!results.length) return null
    const pick = results[Math.floor(Math.random() * Math.min(3, results.length))]
    return pick.original ?? pick.thumbnail ?? null
  } catch {
    return null
  }
}

async function fromSerpAPIShopping(query: string, key: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: key,
      num: '5',
    })
    const res = await fetch(`https://serpapi.com/search?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const results: Array<{ thumbnail: string }> = data.shopping_results ?? []
    const withImages = results.filter(r => r.thumbnail)
    if (!withImages.length) return null
    return withImages[Math.floor(Math.random() * Math.min(3, withImages.length))].thumbnail
  } catch {
    return null
  }
}

async function fromPexels(query: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
      { headers: { Authorization: key }, next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photos: Array<{ src: { medium: string } }> = data.photos ?? []
    if (!photos.length) return null
    return photos[Math.floor(Math.random() * Math.min(3, photos.length))].src.medium
  } catch {
    return null
  }
}

async function fromOpenverse(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const results: Array<{ url: string; thumbnail: string }> = data.results ?? []
    if (!results.length) return null
    const pick = results[Math.floor(Math.random() * Math.min(5, results.length))]
    return pick.url ?? pick.thumbnail ?? null
  } catch {
    return null
  }
}

/**
 * Build a focused search query for a wardrobe item from its AI analysis.
 * More specific than just subcategory + color.
 */
export function wardrobeImageQuery(opts: {
  description: string | null
  subcategory: string | null
  category: string
  colors: string[]
  style_tags: string[]
}): string {
  // Build a tight product-focused query — avoid words that pull lifestyle/model photos
  const color = opts.colors[0] ?? ''
  const item = opts.subcategory || opts.category

  // If AI gave a clean description, use it as the base (it's the most specific)
  if (opts.description && opts.description !== 'Item added manually') {
    // Strip lifestyle phrases that skew results toward model photos
    const cleaned = opts.description
      .replace(/\b(worn by|styled with|paired with|model|woman|man|person|wearing|outfit)\b/gi, '')
      .trim()
    return `${cleaned} clothing product`
  }

  return `${color} ${item} clothing product`.trim()
}
