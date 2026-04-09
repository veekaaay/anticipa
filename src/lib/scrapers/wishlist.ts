import * as cheerio from 'cheerio'
import type { WishlistItem } from '@/types'

type RawImport = Omit<WishlistItem, 'id' | 'user_id' | 'created_at' | 'style_tags' | 'colors' | 'currency'> & {
  style_tags?: string[]
  colors?: string[]
  currency?: string
}

export async function scrapeWishlistURL(url: string): Promise<RawImport[]> {
  const { hostname } = new URL(url)

  if (hostname.includes('pinterest')) return scrapePinterest(url)
  if (hostname.includes('amazon')) return scrapeAmazon(url)
  return scrapeGeneric(url)
}

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Anticipa/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

async function scrapePinterest(url: string): Promise<RawImport[]> {
  // Pinterest boards expose OG data — fetch and parse board pins via API-like approach
  // For MVP: scrape the og:image and title from the board page, then use Pinterest's
  // public board feed endpoint
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)
  const items: RawImport[] = []

  // Pinterest embeds pin data as JSON in <script> tags
  $('script[type="application/json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}')
      // Navigate Pinterest's data structure
      const pins = extractPinsFromPinterestData(data)
      items.push(...pins)
    } catch {}
  })

  // Fallback: og meta if only one pin
  if (!items.length) {
    const title = $('meta[property="og:title"]').attr('content') || $('title').text()
    const image = $('meta[property="og:image"]').attr('content')
    if (title) {
      items.push({
        source_url: url,
        source: 'pinterest',
        image_url: image || null,
        title: title.replace(' | Pinterest', '').trim(),
        price: null,
        category: null,
      })
    }
  }

  return items
}

function extractPinsFromPinterestData(data: Record<string, unknown>): RawImport[] {
  const items: RawImport[] = []
  const str = JSON.stringify(data)
  const pinMatches = str.matchAll(/"description":"([^"]{3,120})","id":"(\d+)"/g)
  for (const m of pinMatches) {
    items.push({
      source_url: `https://pinterest.com/pin/${m[2]}`,
      source: 'pinterest',
      image_url: null,
      title: m[1],
      price: null,
      category: null,
    })
    if (items.length >= 20) break
  }
  return items
}

async function scrapeAmazon(url: string): Promise<RawImport[]> {
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)
  const items: RawImport[] = []

  // Amazon wishlist item cards
  $('[data-id]').each((_, el) => {
    const title = $(el).find('[id^="itemName"]').text().trim()
      || $(el).find('.a-truncate-full').text().trim()
    if (!title) return

    const priceText = $(el).find('.a-price .a-offscreen').first().text().trim()
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null

    const image = $(el).find('img').first().attr('src') || null

    const itemUrl = $(el).find('a[id^="itemName"]').attr('href')
    const fullUrl = itemUrl
      ? itemUrl.startsWith('http') ? itemUrl : `https://www.amazon.com${itemUrl}`
      : url

    items.push({
      source_url: fullUrl,
      source: 'amazon',
      image_url: image,
      title,
      price,
      category: null,
    })
  })

  return items
}

async function scrapeGeneric(url: string): Promise<RawImport[]> {
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim()

  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    null

  const priceText =
    $('meta[property="product:price:amount"]').attr('content') ||
    $('[class*="price"]').first().text().trim() ||
    ''
  const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) || null : null

  if (!title) return []

  return [{
    source_url: url,
    source: 'other',
    image_url: image,
    title: title.substring(0, 200),
    price,
    category: null,
  }]
}
