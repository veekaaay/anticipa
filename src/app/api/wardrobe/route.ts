import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyseWardrobeImage, analyseWardrobeText } from '@/lib/ai/gemini'
import { fetchFashionImage, wardrobeImageQuery } from '@/lib/images'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wardrobe_items')
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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  const file = formData.get('image') as File | null
  const textDescription = (formData.get('description') as string | null)?.slice(0, 500) ?? null

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

  let imageUrl: string | null = null
  let analysis

  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP or GIF images are allowed' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
    }

    // Sanitise filename — strip path separators and non-printable chars
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path = `${user.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('wardrobe')
      .upload(path, buffer, { contentType: file.type })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('wardrobe').getPublicUrl(path)
    imageUrl = publicUrl

    // Analyse with Gemini Vision
    const base64 = buffer.toString('base64')
    analysis = await analyseWardrobeImage(base64, file.type)
  } else if (textDescription) {
    analysis = await analyseWardrobeText(textDescription)
    const query = wardrobeImageQuery({
      description: analysis.description,
      subcategory: analysis.subcategory,
      category: analysis.category,
      colors: analysis.colors,
      style_tags: analysis.style_tags,
    })
    imageUrl = await fetchFashionImage(query)
  } else {
    return NextResponse.json({ error: 'Provide an image or description' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      ...analysis,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let id: string
  try {
    ({ id } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { error } = await supabase
    .from('wardrobe_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
