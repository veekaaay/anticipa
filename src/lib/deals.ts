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

    // Pick the best value result: quality-weighted, price-relative to budget
    const priced = results
      .filter(r => r.price && r.link && /^https?:\/\//.test(r.link))
      .map(r => ({ ...r, numPrice: parseFloat(r.price.replace(/[^0-9.]/g, '')) }))
      .filter(r => !isNaN(r.numPrice) && r.numPrice > 0)

    if (!priced.length) return null

    const maxPrice = budgetMax ?? Math.max(...priced.map(r => r.numPrice), 500)
    const scored = priced
      .map(r => {
        // Price score: 1.0 at $0, 0.0 at budget/ceiling — relative not absolute
        const priceScore = Math.max(0, 1 - r.numPrice / maxPrice)
        // Rating score: use 0.65 default for unrated (benefit of the doubt)
        const ratingScore = r.rating ? r.rating / 5 : 0.65
        // Weight: quality matters more than just being cheap
        return { ...r, score: ratingScore * 0.55 + priceScore * 0.45 }
      })
      .sort((a, b) => b.score - a.score)

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
