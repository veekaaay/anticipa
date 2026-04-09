import { createClient } from '@/lib/supabase/server'
import { Sparkles, Shirt, Heart } from 'lucide-react'
import RecommendationsPanel from '@/components/recommendations/RecommendationsPanel'
import WardrobePanel from '@/components/wardrobe/WardrobePanel'
import WishlistPanel from '@/components/wishlist/WishlistPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: wardrobe }, { data: wishlist }, { data: recommendations }] = await Promise.all([
    supabase.from('wardrobe_items').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('wishlist_items').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('recommendations').select('*').eq('user_id', user!.id).order('score', { ascending: false }),
  ])

  const wardrobeCount = wardrobe?.length ?? 0
  const wishlistCount = wishlist?.length ?? 0
  const recCount = recommendations?.length ?? 0
  const handle = user!.email!.split('@')[0]

  // Nudge copy based on what's missing
  const nudge = wardrobeCount === 0
    ? 'Start by adding a few wardrobe items so Anticipa can learn your style.'
    : wishlistCount === 0
    ? 'Import a Pinterest board or wishlist URL to improve your picks.'
    : recCount === 0
    ? 'Hit "Generate picks" in the Picks tab to get your first curated shopping list.'
    : null

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Your style profile</p>
          <h1 className="text-2xl font-light text-stone-800">Hey, {handle} 👋</h1>
          {nudge && <p className="text-sm text-stone-500 mt-1">{nudge}</p>}
        </div>
        <div className="flex gap-5 text-center">
          {[
            { label: 'Wardrobe', value: wardrobeCount },
            { label: 'Wishlist', value: wishlistCount },
            { label: 'Picks', value: recCount },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xl font-light text-stone-800">{value}</p>
              <p className="text-[11px] text-stone-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-stone-200" />

      {/* Main Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="bg-stone-100 border border-stone-200">
          <TabsTrigger value="recommendations" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Picks
            {recCount > 0 && <span className="ml-0.5 text-[10px] text-stone-400">({recCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="wardrobe" className="gap-1.5">
            <Shirt className="h-3.5 w-3.5" /> Wardrobe
            {wardrobeCount > 0 && <span className="ml-0.5 text-[10px] text-stone-400">({wardrobeCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" /> Wishlist
            {wishlistCount > 0 && <span className="ml-0.5 text-[10px] text-stone-400">({wishlistCount})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <RecommendationsPanel
            initial={recommendations ?? []}
            wardrobeCount={wardrobeCount}
            wishlistCount={wishlistCount}
          />
        </TabsContent>
        <TabsContent value="wardrobe">
          <WardrobePanel initial={wardrobe ?? []} />
        </TabsContent>
        <TabsContent value="wishlist">
          <WishlistPanel initial={wishlist ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
