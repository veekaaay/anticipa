import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeminiWardrobeAnalysis, GeminiRecommendation, WardrobeItem, WishlistItem, StyleProfile } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function parseJSON<T>(text: string): T {
  // Strip markdown code fences if Gemini wraps the response
  const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(clean) as T
}

/** Retry a Gemini call up to 3 times on 503/429 with exponential backoff */
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('Service Unavailable') || msg.includes('Too Many Requests')
      if (!isRetryable || attempt === retries) throw err
      const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}

const FALLBACK_ANALYSIS: GeminiWardrobeAnalysis = {
  category: 'other',
  subcategory: null,
  colors: [],
  style_tags: [],
  brand: null,
  description: 'Item added manually',
}

export async function analyseWardrobeImage(imageBase64: string, mimeType: string): Promise<GeminiWardrobeAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `Analyse this clothing item image and return a JSON object with exactly these fields:
{
  "category": one of [tops, bottoms, dresses, outerwear, shoes, accessories, bags, activewear, swimwear, other],
  "subcategory": specific type (e.g. "crew neck t-shirt", "straight leg jeans"),
  "colors": array of main colors as lowercase strings,
  "style_tags": array of style descriptors from [casual, formal, business, streetwear, bohemian, minimalist, preppy, athletic, vintage, luxury, smart-casual, evening],
  "brand": brand name if visible or null,
  "description": one sentence describing the item
}
Return only valid JSON, no markdown.`

  try {
    const result = await withRetry(() => model.generateContent([
      { inlineData: { data: imageBase64, mimeType } },
      prompt,
    ]))
    return parseJSON<GeminiWardrobeAnalysis>(result.response.text())
  } catch {
    return FALLBACK_ANALYSIS
  }
}

export async function analyseWardrobeText(description: string): Promise<GeminiWardrobeAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `Based on this clothing description: "${description}"
Return a JSON object with exactly these fields:
{
  "category": one of [tops, bottoms, dresses, outerwear, shoes, accessories, bags, activewear, swimwear, other],
  "subcategory": specific type,
  "colors": array of main colors as lowercase strings,
  "style_tags": array from [casual, formal, business, streetwear, bohemian, minimalist, preppy, athletic, vintage, luxury, smart-casual, evening],
  "brand": brand name if mentioned or null,
  "description": clean one sentence description
}
Return only valid JSON, no markdown.`

  try {
    const result = await withRetry(() => model.generateContent(prompt))
    return parseJSON<GeminiWardrobeAnalysis>(result.response.text())
  } catch {
    return { ...FALLBACK_ANALYSIS, description }
  }
}

export async function generateRecommendations(
  wardrobe: WardrobeItem[],
  wishlist: WishlistItem[],
  budget?: { min?: number; max?: number },
  profile?: StyleProfile | null
): Promise<GeminiRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const wardrobeSummary = wardrobe.map((w, i) =>
    `[${i + 1}] ${w.subcategory || w.category} — colors: ${w.colors.join(', ') || 'unknown'}, style: ${w.style_tags.join(', ') || 'untagged'}${w.brand ? `, brand: ${w.brand}` : ''}${w.description ? `, desc: ${w.description}` : ''}`
  ).join('\n')

  const wishlistSummary = wishlist.map(w =>
    `• "${w.title}" — category: ${w.category || 'unknown'}, colors: ${w.colors.join(', ') || 'unknown'}, style: ${w.style_tags.join(', ') || 'unknown'}${w.price ? `, price: $${w.price}` : ''}`
  ).join('\n')

  // Pre-compute wardrobe gap analysis in JS (more reliable than letting Gemini infer it)
  const ALL_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes', 'dresses', 'accessories', 'bags', 'activewear']
  const catCounts = wardrobe.reduce<Record<string, number>>((acc, w) => {
    acc[w.category] = (acc[w.category] || 0) + 1
    return acc
  }, {})
  const presentCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `${cat} (${n})`)
    .join(', ')
  const missingCats = ALL_CATEGORIES.filter(c => !catCounts[c])
  const thinCats = ALL_CATEGORIES.filter(c => catCounts[c] === 1)

  // Dominant colors and styles
  const colorFreq = wardrobe.flatMap(w => w.colors).reduce<Record<string, number>>((a, c) => { a[c] = (a[c] || 0) + 1; return a }, {})
  const styleFreq = wardrobe.flatMap(w => w.style_tags).reduce<Record<string, number>>((a, s) => { a[s] = (a[s] || 0) + 1; return a }, {})
  const topColors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c)
  const topStyles = Object.entries(styleFreq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s)

  const gapAnalysis = wardrobe.length > 0 ? `
WARDROBE ANALYSIS (pre-computed):
- Categories present: ${presentCats || 'none'}
- Missing entirely: ${missingCats.length ? missingCats.join(', ') : 'none'}
- Under-represented (1 item): ${thinCats.length ? thinCats.join(', ') : 'none'}
- Dominant wardrobe colors: ${topColors.join(', ') || 'unknown'}
- Dominant wardrobe styles: ${topStyles.join(', ') || 'unknown'}` : ''

  // Budget: prefer profile values, fall back to passed-in budget
  const effectiveBudgetMin = profile?.budget_min ?? budget?.min
  const effectiveBudgetMax = profile?.budget_max ?? budget?.max
  const budgetStr = effectiveBudgetMax
    ? `Budget constraint: $${effectiveBudgetMin || 0}–$${effectiveBudgetMax} per item — only recommend items within this range`
    : 'No budget constraint'

  // Gender for search queries
  const gender = profile?.gender && profile.gender !== 'unisex' ? profile.gender : null
  const genderNote = gender
    ? `Shopping for: ${gender} — append "${gender}" to ALL search_query fields`
    : 'Gender: unisex — keep search queries gender-neutral or specify both'

  // Style + colour preferences
  const styleNote = profile?.dominant_styles?.length
    ? `Preferred styles: ${profile.dominant_styles.join(', ')} — weight recommendations toward these aesthetics`
    : null
  const colorNote = profile?.color_palette?.length
    ? `Favourite colours: ${profile.color_palette.join(', ')} — prefer recommendations in these palette tones`
    : null
  const categoryNote = profile?.preferred_categories?.length
    ? `Most-shopped categories: ${profile.preferred_categories.join(', ')} — prioritise these when gap urgency is equal`
    : null

  const profileSection = [genderNote, budgetStr, styleNote, colorNote, categoryNote]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are Anticipa — a sharp, opinionated personal stylist AI. Your job: precise, actionable shopping picks grounded in real wardrobe gaps and desire signals. No generic output.

---
USER PROFILE:
${profileSection}
${gapAnalysis}

WARDROBE (${wardrobe.length} items):
${wardrobeSummary || '(empty — rely on wishlist signals)'}

WISHLIST DESIRES (${wishlist.length} items):
${wishlistSummary || '(none — rely on wardrobe gaps)'}
---

YOUR PROCESS:
1. STYLE FINGERPRINT — From the wardrobe's dominant colors (${topColors.join(', ') || 'unknown'}) and styles (${topStyles.join(', ') || 'unknown'}), what is the person's core aesthetic? Cross-reference with their profile preferences.
2. GAP AUDIT — Use the pre-computed gap analysis above. Missing categories are the highest-urgency gaps. Thin categories (1 item) are secondary.
3. DESIRE SIGNALS — From the wishlist, what price points, silhouettes, and aesthetics is this person actively seeking?
4. CROSSMATCH — For each pick, name 1-2 specific wardrobe items it pairs with (use item numbers). A pick that pairs with nothing scores below 60.

RULES:
- Be specific: "Oversized black wool overcoat" not "a coat"
- Each pick must fill a gap OR answer a wishlist desire — never both vaguely
- Missing categories take priority — at least 4 of your 6 picks must address missing/thin categories
- Picks must span at least 4 different categories — don't recommend 3 tops
- Name specific wardrobe item numbers in every reason field
- Respect the budget hard — never recommend items likely above the stated max
- If wardrobe is empty: infer style from wishlist; if both empty: pick capsule wardrobe foundations

SCORING (be honest — use the full range, don't cluster at 80):
- 90-100: missing category + wishlist match + pairs with 2+ items
- 75-89: missing/thin category OR wishlist match + pairs with 1-2 items
- 55-74: nice complement, good style match, pairs with at least 1 item
- Below 55: only if padding to reach 6 picks

SEARCH QUERY (sent directly to Google Shopping — this is critical):
- Format: [color] [material] [silhouette/cut] [product type] [gender]
- 4-7 words maximum, no filler adjectives
- Good: "oversized black wool overcoat women" / "slim navy chino trousers men"
- Bad: "stylish coat for minimalist woman"

Return a JSON array of exactly 6 objects, sorted by score descending:
{
  "title": specific name — color, material, cut (e.g. "Oversized Black Wool Overcoat"),
  "description": one sharp sentence on why this piece is worth buying now,
  "reason": gap/desire addressed + "pairs with item [N] and item [M]",
  "outfits_unlocked": realistic integer (how many new complete outfits with existing wardrobe),
  "category": one of [tops, bottoms, dresses, outerwear, shoes, accessories, bags, activewear, swimwear, other],
  "style_tags": 2-3 specific descriptors,
  "colors": 1-3 recommended colors as lowercase strings,
  "search_query": 4-7 word Google Shopping query,
  "score": 0-100 integer
}

Return only valid JSON. No markdown, no explanation, no preamble.`

  const result = await withRetry(() => model.generateContent(prompt))
  const recs = parseJSON<GeminiRecommendation[]>(result.response.text())

  if (!Array.isArray(recs)) throw new Error('Gemini returned unexpected format for recommendations')
  return recs
}
