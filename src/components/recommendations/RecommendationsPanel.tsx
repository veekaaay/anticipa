'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Sparkles, RefreshCw, Loader2, ExternalLink, ShoppingBag, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { Recommendation } from '@/types'

export default function RecommendationsPanel({
  initial,
  wardrobeCount,
  wishlistCount,
}: {
  initial: Recommendation[]
  wardrobeCount: number
  wishlistCount: number
}) {
  const [recs, setRecs] = useState(initial)
  const [loading, setLoading] = useState(false)

  const canGenerate = wardrobeCount > 0 || wishlistCount > 0

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/recommendations', { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const data = await res.json()
      setRecs(data)
      toast.success('Your picks have been refreshed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate picks')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">
            {recs.length > 0
              ? `${recs.length} curated picks based on your style`
              : 'No picks yet — let Anticipa analyse your style'}
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={loading || !canGenerate}
          size="sm"
          className="bg-stone-800 hover:bg-stone-900 gap-1.5"
        >
          {loading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Curating…</>
            : <><RefreshCw className="h-3.5 w-3.5" /> {recs.length ? 'Refresh picks' : 'Generate picks'}</>
          }
        </Button>
      </div>

      {!canGenerate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Add at least one wardrobe item or wishlist item first — Anticipa needs to learn your style before making picks.
        </div>
      )}

      {recs.length === 0 && canGenerate && !loading && (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">✨</div>
          <p className="text-stone-600 font-light">Ready to curate your picks</p>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            Anticipa will analyse your wardrobe and wishlist to find what you&apos;re actually missing — and where to get it for less.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 space-y-4">
          <Loader2 className="h-8 w-8 text-stone-400 animate-spin mx-auto" />
          <p className="text-stone-500 text-sm">Analysing your style and finding deals…</p>
          <p className="text-stone-400 text-xs">This takes about 15–20 seconds</p>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recs.map(rec => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card className="border-stone-200 shadow-none overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-stone-100">
        {rec.image_url ? (
          <Image src={rec.image_url} alt={rec.title} fill className="object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-stone-300" />
          </div>
        )}
        {/* Score badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-stone-800/90 text-white text-[10px] px-2">
            {rec.score}% match
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Title + category */}
        <div>
          <p className="font-medium text-stone-800 text-sm leading-snug">{rec.title}</p>
          <p className="text-xs text-stone-400 capitalize mt-0.5">{rec.category}</p>
        </div>

        {/* Why Anticipa picked this */}
        <div className="bg-stone-50 rounded-md p-2.5 text-xs text-stone-600 leading-relaxed">
          <span className="font-medium text-stone-700">Why: </span>{rec.reason}
        </div>

        {/* Outfits unlocked */}
        {rec.outfits_unlocked > 0 && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Shirt className="h-3.5 w-3.5 text-stone-400" />
            Unlocks {rec.outfits_unlocked} outfit{rec.outfits_unlocked !== 1 ? 's' : ''} in your wardrobe
          </div>
        )}

        {/* Style tags */}
        <div className="flex flex-wrap gap-1">
          {rec.style_tags.slice(0, 3).map(t => (
            <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-500 capitalize">{t}</Badge>
          ))}
        </div>

        {/* Match score bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-stone-400">
            <span>Style match</span><span>{rec.score}%</span>
          </div>
          <Progress value={rec.score} className="h-1 bg-stone-100" />
        </div>

        {/* Deal / CTA */}
        <div className="mt-auto pt-1">
          {rec.deal_url ? (
            <a href={rec.deal_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="w-full bg-stone-800 hover:bg-stone-900 gap-1.5 text-xs">
                {rec.deal_price ? `Shop · $${rec.deal_price.toFixed(2)}` : 'Shop this pick'}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          ) : (
            <Button size="sm" variant="outline" className="w-full text-xs text-stone-500" disabled>
              No deal found yet
            </Button>
          )}
          {rec.deal_source && (
            <p className="text-[10px] text-stone-400 text-center mt-1">via {rec.deal_source}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
