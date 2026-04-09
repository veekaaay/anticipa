import { createClient } from '@/lib/supabase/server'
import { Sparkles, Shirt, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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

  const stats = [
    { label: 'Wardrobe items', value: wardrobe?.length ?? 0, icon: Shirt },
    { label: 'Wishlist items', value: wishlist?.length ?? 0, icon: Heart },
    { label: 'Picks for you', value: recommendations?.length ?? 0, icon: Sparkles },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light tracking-wide text-stone-800">Your Style Dashboard</h1>
        <p className="text-stone-500 mt-1 text-sm">Anticipa learns your style and finds what you&apos;ll love next.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-stone-200 shadow-none">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-stone-600" />
                </div>
                <div>
                  <p className="text-2xl font-light text-stone-800">{value}</p>
                  <p className="text-xs text-stone-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="bg-stone-100 border border-stone-200">
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Picks for You
          </TabsTrigger>
          <TabsTrigger value="wardrobe" className="gap-2">
            <Shirt className="h-3.5 w-3.5" /> Wardrobe
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="h-3.5 w-3.5" /> Wishlist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <RecommendationsPanel
            initial={recommendations ?? []}
            wardrobeCount={wardrobe?.length ?? 0}
            wishlistCount={wishlist?.length ?? 0}
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
