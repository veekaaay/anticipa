import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFashionImage, wardrobeImageQuery } from '@/lib/images'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find items with no image
  const { data: items, error } = await supabase
    .from('wardrobe_items')
    .select('id, description, subcategory, category, colors, style_tags')
    .eq('user_id', user.id)
    .is('image_url', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!items?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  for (const item of items) {
    const query = wardrobeImageQuery({
      description: item.description,
      subcategory: item.subcategory,
      category: item.category,
      colors: item.colors ?? [],
      style_tags: item.style_tags ?? [],
    })
    const imageUrl = await fetchFashionImage(query)
    if (imageUrl) {
      await supabase.from('wardrobe_items').update({ image_url: imageUrl }).eq('id', item.id)
      updated++
    }
  }

  return NextResponse.json({ updated, total: items.length })
}
