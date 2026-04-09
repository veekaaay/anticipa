import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeWishlistURL } from '@/lib/scrapers/wishlist'
import { analyseWardrobeText } from '@/lib/ai/gemini'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Scrape items from the URL
  const scraped = await scrapeWishlistURL(url)
  if (!scraped.length) return NextResponse.json({ error: 'No items found at that URL' }, { status: 422 })

  // Enrich each item with AI style tags
  const enriched = await Promise.all(
    scraped.slice(0, 20).map(async (item) => {
      try {
        const analysis = await analyseWardrobeText(item.title)
        return {
          user_id: user.id,
          source_url: item.source_url,
          source: item.source,
          image_url: item.image_url,
          title: item.title,
          price: item.price,
          currency: item.currency || 'USD',
          style_tags: analysis.style_tags,
          colors: analysis.colors,
          category: analysis.category,
        }
      } catch {
        return {
          user_id: user.id,
          source_url: item.source_url,
          source: item.source,
          image_url: item.image_url,
          title: item.title,
          price: item.price,
          currency: 'USD',
          style_tags: [],
          colors: [],
          category: item.category,
        }
      }
    })
  )

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert(enriched)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
