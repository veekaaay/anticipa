import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeminiWardrobeAnalysis, GeminiRecommendation, WardrobeItem, WishlistItem, StyleProfile } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function parseJSON<T>(text: string): T {
  // Strip markdown code fences if Gemini wraps the response
  const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(clean) as T
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
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType } },
      prompt,
    ])
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
    const result = await model.generateContent(prompt)
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

  const prompt = `You are Anticipa — a sharp, opinionated personal stylist AI. Your job is to give precise, actionable shopping recommendations based on real wardrobe gaps and desire signals. Do not be generic.

---
USER PROFILE:
${profileSection}

WARDROBE (${wardrobe.length} items):
${wardrobeSummary || '(empty — rely on wishlist signals)'}

WISHLIST DESIRES (${wishlist.length} items):
${wishlistSummary || '(none — rely on wardrobe gaps)'}
---

YOUR PROCESS:
1. STYLE FINGERPRINT — What is this person's dominant aesthetic? (e.g. "minimalist earth tones with occasional streetwear") What color palette recurs? What silhouettes do they gravitate toward? Cross-reference with their stated style preferences.
2. GAP AUDIT — Which categories are empty or thin? What capsule staples are clearly missing? What would make the wardrobe more versatile?
3. DESIRE SIGNALS — From the wishlist, what categories, aesthetics, and price points is this person actively seeking?
4. CROSSMATCH — For each recommendation, identify which 1-2 existing wardrobe items it pairs with. A pick that pairs with nothing is useless.

RULES:
- Be specific: "Wide-leg ivory linen trousers" not "nice pants"
- Each pick must either fill a gap OR directly answer a wishlist desire — state which
- Name the wardrobe items it pairs with (use item numbers from the list)
- If wardrobe is empty, lean entirely on wishlist signals to infer style
- If both are empty, recommend foundational capsule wardrobe pieces
- Respect the budget — do not recommend items likely outside the stated range

SCORING GUIDE (be honest — spread scores, don't cluster everything at 80+):
- 90-100: fills a critical gap AND matches 3+ wishlist signals AND pairs with 2+ wardrobe items
- 70-89: fills a real gap OR matches wishlist signals, pairs with 1-2 wardrobe items
- 50-69: nice-to-have, loosely matches style but no urgent gap
- Below 50: only if you must pad to 6 items

SEARCH QUERY RULES (critical — this query is sent directly to Google Shopping):
- Include: color + material + silhouette + product type + gender
- Keep under 8 words
- No adjectives like "beautiful", "stylish", "perfect"
- Good example: "wide leg ivory linen trousers women high waist"
- Bad example: "stylish trousers for women who love minimalism"

Return a JSON array of exactly 6 objects, sorted by score descending:
{
  "title": specific product name with color/material/cut where relevant,
  "description": one sentence on what makes this piece worth buying,
  "reason": which gap or desire this addresses + "pairs with [item X] and [item Y] from your wardrobe",
  "outfits_unlocked": realistic integer — how many new outfit combos with existing wardrobe,
  "category": one of [tops, bottoms, dresses, outerwear, shoes, accessories, bags, activewear, swimwear, other],
  "style_tags": 2-3 specific style descriptors,
  "colors": 2-3 recommended colors as lowercase strings,
  "search_query": precise Google Shopping query, 4-8 words, color + material + type + gender,
  "score": 0-100 integer — be honest, spread across the range
}

Return only a valid JSON array. No markdown, no explanation, no preamble.`

  const result = await model.generateContent(prompt)
  const recs = parseJSON<GeminiRecommendation[]>(result.response.text())

  if (!Array.isArray(recs)) throw new Error('Gemini returned unexpected format for recommendations')
  return recs
}
