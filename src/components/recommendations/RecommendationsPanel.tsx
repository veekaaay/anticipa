'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Sparkles, RefreshCw, Loader2, ExternalLink, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Recommendation } from '@/types'
import { resolveColor, itemGradient, CATEGORY_EMOJI } from '@/lib/colors'

function shopUrl(rec: Recommendation): string {
  if (rec.deal_url) return rec.deal_url
  const q = rec.search_query ?? rec.title
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
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
    <div className="space-y-5">
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
          Add at least one wardrobe item or wishlist item first — Anticipa needs to learn your style before making picks.
        </div>
      )}

      {recs.length === 0 && canGenerate && !loading && (
        <div className="text-center py-20 space-y-3">
          <Sparkles className="h-8 w-8 text-stone-300 mx-auto" />
          <p className="text-stone-600 font-light">Ready to curate your picks</p>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            Anticipa analyses your wardrobe and wishlist to surface exactly what you&apos;re missing — and where to get it.
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
            <RecommendationCard key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const gradient = itemGradient(rec.colors)
  const emoji = CATEGORY_EMOJI[rec.category?.toLowerCase() ?? ''] ?? '🛍️'
  const url = shopUrl(rec)
  const label = shopLabel(rec)

  return (
    <Card className="border-stone-200 shadow-none overflow-hidden group">
      <div className="flex">
        {/* Visual block */}
        <div className="relative w-32 sm:w-40 flex-shrink-0" style={{ background: gradient }}>
          {rec.image_url ? (
            <div className="relative h-full w-full min-h-[10rem]">
              <Image src={rec.image_url} alt={rec.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-full min-h-[10rem] flex flex-col items-center justify-center gap-2 p-3">
              <span className="text-4xl">{emoji}</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {rec.colors.slice(0, 3).map(c => (
                  <span
                    key={c}
                    title={c}
                    className="inline-block h-3 w-3 rounded-full border border-white/60"
                    style={{ backgroundColor: resolveColor(c) }}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Rank pill */}
          <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-stone-900/60 text-white text-[10px] font-semibold flex items-center justify-center">
            {rank}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex flex-col gap-2.5 flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 text-sm leading-snug">{rec.title}</p>
              <p className="text-[11px] text-stone-400 capitalize mt-0.5">{rec.category}</p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              {rec.score}% match
            </span>
          </div>

          {/* Description */}
          {rec.description && (
            <p className="text-[11px] text-stone-500 leading-relaxed line-clamp-1">{rec.description}</p>
          )}

          {/* Why */}
          <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 bg-stone-50 rounded-md px-2.5 py-2">
            <span className="font-medium text-stone-700">Why: </span>{rec.reason}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-stone-400 flex-wrap">
            {rec.outfits_unlocked > 0 && (
              <span className="flex items-center gap-1">
                <Shirt className="h-3 w-3" />
                +{rec.outfits_unlocked} outfit{rec.outfits_unlocked !== 1 ? 's' : ''}
              </span>
            )}
            {rec.style_tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 capitalize border-stone-200 text-stone-400">{t}</Badge>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-0.5 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="flex-1 gap-1.5 text-xs bg-stone-800 hover:bg-stone-900 h-8"
            >
              {label} <ExternalLink className="h-3 w-3" />
            </Button>
            {rec.deal_source && (
              <span className="text-[10px] text-stone-400 shrink-0">via {rec.deal_source}</span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
