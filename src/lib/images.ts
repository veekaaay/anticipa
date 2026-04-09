export async function fetchFashionImage(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
      {
        headers: { Authorization: key },
        next: { revalidate: 86400 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photos: Array<{ src: { medium: string } }> = data.photos ?? []
    if (!photos.length) return null
    // Pick randomly from top 3 for variety across refreshes
    return photos[Math.floor(Math.random() * photos.length)].src.medium
  } catch {
    return null
  }
}
