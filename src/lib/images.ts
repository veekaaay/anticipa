export async function fetchFashionImage(query: string): Promise<string | null> {
  // Prefer Pexels if key is available (higher quality product photos)
  const pexelsKey = process.env.PEXELS_API_KEY
  if (pexelsKey) {
    const url = await fromPexels(query, pexelsKey)
    if (url) return url
  }

  // Free fallback: Openverse (Creative Commons licensed fashion photos, no key needed)
  return fromOpenverse(query)
}

async function fromPexels(query: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
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
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query + ' clothing fashion')}&page_size=10&license_type=commercial`,
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
