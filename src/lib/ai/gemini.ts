import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeminiWardrobeAnalysis, GeminiRecommendation, WardrobeItem, WishlistItem } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Analyse a wardrobe photo and extract clothing metadata
export async function analyseWardrobeImage(imageBase64: string, mimeType: string): Promise<GeminiWardrobeAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    prompt,
  ])

  const text = result.response.text().trim()
  return JSON.parse(text) as GeminiWardrobeAnalysis
}

// Analyse a text description of a wardrobe item
export async function analyseWardrobeText(description: string): Promise<GeminiWardrobeAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  return JSON.parse(text) as GeminiWardrobeAnalysis
}

// Generate curated shopping recommendations from wardrobe + wishlist
export async function generateRecommendations(
  wardrobe: WardrobeItem[],
  wishlist: WishlistItem[],
  budget?: { min?: number; max?: number }
): Promise<GeminiRecommendation[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const wardrobeSummary = wardrobe.map(w =>
    `${w.category} (${w.subcategory || 'general'}): colors [${w.colors.join(', ')}], styles [${w.style_tags.join(', ')}]`
  ).join('\n')

  const wishlistSummary = wishlist.map(w =>
    `${w.title}: category ${w.category || 'unknown'}, colors [${w.colors.join(', ')}], styles [${w.style_tags.join(', ')}]${w.price ? `, ~$${w.price}` : ''}`
  ).join('\n')

  const budgetStr = budget?.max ? `Budget: $${budget.min || 0}–$${budget.max}` : 'No specific budget'

  const prompt = `You are a personal stylist AI for a platform called Anticipa.

WARDROBE (${wardrobe.length} items):
${wardrobeSummary || 'Empty wardrobe'}

WISHLIST (${wishlist.length} items):
${wishlistSummary || 'No wishlist items'}

${budgetStr}

Analyse the wardrobe for gaps, identify the user's style from both wardrobe and wishlist, then generate exactly 6 curated shopping recommendations that:
1. Fill actual gaps in the wardrobe
2. Align with the user's proven style preferences from the wishlist
3. Maximise outfit combinations with existing items

Return a JSON array of 6 objects, each with:
{
  "title": short product name,
  "description": 1-2 sentence product description,
  "reason": specific reason this fills a gap or matches their style (mention specific wardrobe items it pairs with),
  "outfits_unlocked": estimated number of new outfit combinations this unlocks with existing wardrobe,
  "category": product category,
  "style_tags": array of style tags,
  "colors": array of recommended colors for this item,
  "search_query": specific Google Shopping search query to find this item (e.g. "white linen button-down shirt women"),
  "score": relevance score 0-100
}

Sort by score descending. Return only valid JSON array, no markdown.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  // Strip markdown code blocks if present
  const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(clean) as GeminiRecommendation[]
}
