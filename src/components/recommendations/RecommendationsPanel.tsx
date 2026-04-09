'use client'
import { useState } from 'react'
import { Sparkles, RefreshCw, Loader2, ExternalLink, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Recommendation } from '@/types'

const COLOR_MAP: Record<string, string> = {
  black: '#1c1917', white: '#fafaf9', grey: '#a8a29e', gray: '#a8a29e',
  navy: '#1e3a5f', blue: '#3b82f6', red: '#ef4444', pink: '#f472b6',
  green: '#22c55e', olive: '#6b7c45', brown: '#92400e', tan: '#c8a882',
  beige: '#e8dcc8', cream: '#fdf8f0', camel: '#c19a6b', khaki: '#c3b091',
  yellow: '#eab308', orange: '#f97316', purple: '#a855f7', burgundy: '#800020',
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    tops: '👕', bottoms: '👖', dresses: '👗', outerwear: '🧥',
    shoes: '👟', accessories: '👜', bags: '👜', activewear: '🏃',
    swimwear: '🩱', other: '🛍️',
  }
  return map[cat?.toLowerCase()] ?? '🛍️'
}

function shopUrl(rec: Recommendation): string {
  if (rec.deal_url) return rec.deal_url
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.title)}`
}

function shopLabel(rec: Recommendation): string {
  if (rec.deal_url && rec.deal_price) return `Shop · $${rec.deal_price.toFixed(2)}`
  if (rec.deal_url) return 'Shop this pick'
  return 'Search Google Shopping'
}

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
        <p className="text-sm text-stone-500">
          {recs.length > 0
            ? `${recs.length} curated picks based on your style`
            : 'No picks yet — let Anticipa analyse your style'}
        </p>
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
          Add at least one wardrobe item or wishlist item first.
        </div>
      )}

      {recs.length === 0 && canGenerate && !loading && (
        <div className="text-center py-20 space-y-3">
          <Sparkles className="h-8 w-8 text-stone-300 mx-auto" />
          <p className="text-stone-600 font-light">Ready to curate your picks</p>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            Anticipa will analyse your wardrobe and wishlist to surface what you&apos;re actually missing.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 text-stone-400 animate-spin mx-auto" />
          <p className="text-stone-500 text-sm">Analysing your style…</p>
          <p className="text-stone-400 text-xs">This takes about 15–20 seconds</p>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <div className="space-y-3">
          {recs.map((rec, i) => (
            <RecommendationRow key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationRow({ rec, rank }: { rec: Recommendation; rank: number }) {
  const primaryColor = COLOR_MAP[rec.colors?.[0]?.toLowerCase() ?? ''] ?? '#e7e5e4'
  const url = shopUrl(rec)
  const label = shopLabel(rec)

  function open() {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="border-stone-200 shadow-none overflow-hidden">
      <div className="flex">
        {/* Color tile — shows category emoji on the item's primary color */}
        <div
          className="relative w-28 sm:w-36 flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4"
          style={{ backgroundColor: primaryColor + '33' }} // 20% opacity tint
        >
          <span className="text-3xl">{categoryEmoji(rec.category)}</span>
          <span className="text-[10px] text-stone-500 capitalize text-center px-1 leading-tight">
            {rec.category}
          </span>
          {/* Rank */}
          <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-stone-800/70 text-white text-[10px] font-medium flex items-center justify-center">
            {rank}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-stone-800 text-sm leading-snug">{rec.title}</p>
            <Badge className="bg-stone-100 text-stone-600 border-0 text-[11px] font-normal shrink-0 whitespace-nowrap">
              {rec.score}% match
            </Badge>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{rec.reason}</p>

          <div className="flex items-center flex-wrap gap-2 text-xs text-stone-400">
            {rec.outfits_unlocked > 0 && (
              <span className="flex items-center gap-1">
                <Shirt className="h-3 w-3" />
                +{rec.outfits_unlocked} outfit{rec.outfits_unlocked !== 1 ? 's' : ''}
              </span>
            )}
            {rec.colors.slice(0, 4).map(c => (
              <span
                key={c}
                title={c}
                className="inline-block h-3.5 w-3.5 rounded-full border border-stone-300"
                style={{ backgroundColor: COLOR_MAP[c.toLowerCase()] ?? '#d6d3d1' }}
              />
            ))}
            {rec.style_tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-400 capitalize border-stone-200">{t}</Badge>
            ))}
          </div>

          <div className="pt-1">
            <Button
              size="sm"
              onClick={open}
              className="w-full gap-1.5 text-xs bg-stone-800 hover:bg-stone-900"
            >
              {label} <ExternalLink className="h-3 w-3" />
            </Button>
            {rec.deal_source && (
              <p className="text-[10px] text-stone-400 text-center mt-1">via {rec.deal_source}</p>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
