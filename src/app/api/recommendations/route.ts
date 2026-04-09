import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRecommendations } from '@/lib/ai/gemini'
import { findDeals } from '@/lib/deals'
import { fetchFashionImage } from '@/lib/images'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch wardrobe + wishlist + style profile
  const [wardrobeRes, wishlistRes, profileRes] = await Promise.all([
    supabase.from('wardrobe_items').select('*').eq('user_id', user.id),
    supabase.from('wishlist_items').select('*').eq('user_id', user.id),
    supabase.from('style_profiles').select('*').eq('user_id', user.id).single(),
  ])

  const wardrobe = wardrobeRes.data || []
  const wishlist = wishlistRes.data || []
  const profile = profileRes.data

  if (!wardrobe.length && !wishlist.length) {
    return NextResponse.json(
      { error: 'Add some wardrobe items or wishlist items first' },
      { status: 422 }
    )
  }

  // Generate AI recommendations
  let aiRecs
  try {
    aiRecs = await generateRecommendations(wardrobe, wishlist, {
      min: profile?.budget_min ?? undefined,
      max: profile?.budget_max ?? undefined,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI generation failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Find real deals for each recommendation in parallel
  const withDeals = await Promise.all(
    aiRecs.map(async (rec) => {
      const [deal, pexelsImage] = await Promise.all([
        findDeals(rec.search_query, profile?.budget_max ?? undefined),
        fetchFashionImage(rec.search_query),
      ])
      return {
        user_id: user.id,
        title: rec.title,
        description: rec.description,
        reason: rec.reason,
        outfits_unlocked: rec.outfits_unlocked,
        category: rec.category,
        style_tags: rec.style_tags,
        colors: rec.colors,
        // Prefer SerpAPI deal image, fall back to Pexels fashion photo
        image_url: deal?.image_url ?? pexelsImage ?? null,
        deal_url: deal?.url ?? null,
        deal_price: deal?.price ?? null,
        deal_source: deal?.source ?? null,
        score: rec.score,
        search_query: rec.search_query ?? null,
      }
    })
  )

  // Delete old recommendations and insert fresh ones
  await supabase.from('recommendations').delete().eq('user_id', user.id)

  const { data, error } = await supabase
    .from('recommendations')
    .insert(withDeals)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
