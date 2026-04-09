interface Deal {
  title: string
  price: number
  currency: string
  url: string
  source: string
  image_url: string | null
  rating: number | null
}

export async function findDeals(searchQuery: string, budgetMax?: number): Promise<Deal | null> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: searchQuery,
      api_key: apiKey,
      num: '10',
      ...(budgetMax ? { price_max: String(budgetMax) } : {}),
    })

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      next: { revalidate: 3600 }, // cache for 1 hour
    })

    if (!res.ok) return null
    const data = await res.json()

    const results = data.shopping_results as Array<{
      title: string
      price: string
      link: string
      source: string
      thumbnail: string
      rating?: number
    }>

    if (!results?.length) return null

    // Pick the best value result (lowest price with decent rating)
    const scored = results
      .filter(r => r.price && r.link)
      .map(r => {
        const price = parseFloat(r.price.replace(/[^0-9.]/g, ''))
        const rating = r.rating || 3
        return { ...r, numPrice: price, score: (rating / 5) * 0.4 + (1 - price / 500) * 0.6 }
      })
      .filter(r => !isNaN(r.numPrice) && r.numPrice > 0)
      .sort((a, b) => b.score - a.score)

    if (!scored.length) return null
    const best = scored[0]

    return {
      title: best.title,
      price: best.numPrice,
      currency: 'USD',
      url: best.link,
      source: best.source,
      image_url: best.thumbnail || null,
      rating: best.rating || null,
    }
  } catch {
    return null
  }
}
