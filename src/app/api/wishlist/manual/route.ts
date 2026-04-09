import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyseWardrobeText } from '@/lib/ai/gemini'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let title: string, source_url: string | null, price: number | null
  try {
    ({ title, source_url = null, price = null } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const safeTitle = title.trim().slice(0, 200)

  // Enrich with AI style analysis
  let analysis = { style_tags: [] as string[], colors: [] as string[], category: null as string | null }
  try {
    const result = await analyseWardrobeText(safeTitle)
    analysis = { style_tags: result.style_tags, colors: result.colors, category: result.category }
  } catch { /* proceed without enrichment */ }

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: user.id,
      source_url: source_url || safeTitle, // use title as fallback identifier
      source: 'manual',
      image_url: null,
      title: safeTitle,
      price: price && price > 0 ? price : null,
      currency: 'USD',
      style_tags: analysis.style_tags,
      colors: analysis.colors,
      category: analysis.category,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
