'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Sparkles, RefreshCw, Loader2, ExternalLink, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Recommendation } from '@/types'

function shopUrl(rec: Recommendation): string {
  if (rec.deal_url) return rec.deal_url
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(rec.title)}`
}

function shopLabel(rec: Recommendation): string {
  if (rec.deal_url && rec.deal_price) return `Shop · $${rec.deal_price.toFixed(2)}`
  if (rec.deal_url) return 'Shop this pick'
  return 'Search Google Shopping'
}

const COLOR_MAP: Record<string, string> = {
  black: '#111', white: '#f5f5f4', grey: '#9ca3af', gray: '#9ca3af',
  navy: '#1e3a5f', blue: '#3b82f6', red: '#ef4444', pink: '#f472b6',
  green: '#22c55e', olive: '#6b7c45', brown: '#92400e', tan: '#c8a882',
  beige: '#e8dcc8', cream: '#faf5e4', camel: '#c19a6b', khaki: '#c3b091',
  yellow: '#eab308', orange: '#f97316', purple: '#a855f7', burgundy: '#800020',
}

function ColorSwatch({ color }: { color: string }) {
  const bg = COLOR_MAP[color.toLowerCase()] ?? '#d6d3d1'
  const isLight = ['white', 'cream', 'beige', '#f5f5f4', '#faf5e4', '#fafaf9', '#e8dcc8'].includes(bg)
  return (
    <span
      title={color}
      className={`inline-block h-4 w-4 rounded-full border ${isLight ? 'border-stone-300' : 'border-transparent'}`}
      style={{ backgroundColor: bg }}
    />
  )
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
      {/* Header */}
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
        <div className="space-y-4">
          {recs.map((rec, i) => (
            <RecommendationRow key={rec.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationRow({ rec, rank }: { rec: Recommendation; rank: number }) {
  const url = shopUrl(rec)
  const label = shopLabel(rec)
  const isActualDeal = !!rec.deal_url

  return (
    <Card className="border-stone-200 shadow-none overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-40 h-44 sm:h-auto flex-shrink-0 bg-stone-100">
          {rec.image_url ? (
            <Image src={rec.image_url} alt={rec.title} fill className="object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center text-4xl select-none">
              🛍️
            </div>
          )}
          {/* Rank */}
          <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-stone-800/80 text-white text-[10px] font-medium flex items-center justify-center">
            {rank}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex flex-col gap-3 flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-stone-800 text-sm leading-snug">{rec.title}</p>
              <p className="text-xs text-stone-400 capitalize mt-0.5">{rec.category}</p>
            </div>
            <Badge className="bg-stone-100 text-stone-600 border-0 text-[11px] font-normal shrink-0">
              {rec.score}% match
            </Badge>
          </div>

          {/* Why picked */}
          <p className="text-xs text-stone-500 leading-relaxed">{rec.reason}</p>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-stone-400">
            {rec.outfits_unlocked > 0 && (
              <span className="flex items-center gap-1">
                <Shirt className="h-3 w-3" />
                Unlocks {rec.outfits_unlocked} outfit{rec.outfits_unlocked !== 1 ? 's' : ''}
              </span>
            )}
            {rec.colors.length > 0 && (
              <span className="flex items-center gap-1">
                {rec.colors.slice(0, 4).map(c => (
                  <ColorSwatch key={c} color={c} />
                ))}
              </span>
            )}
            {rec.style_tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-400 capitalize border-stone-200">{t}</Badge>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-1 flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button
                size="sm"
                className={`w-full gap-1.5 text-xs ${isActualDeal ? 'bg-stone-800 hover:bg-stone-900' : 'bg-stone-700 hover:bg-stone-800'}`}
              >
                {label}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            {rec.deal_source && (
              <p className="text-[10px] text-stone-400 shrink-0">via {rec.deal_source}</p>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
