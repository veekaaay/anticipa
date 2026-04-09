'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, Upload, Type, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { WardrobeItem } from '@/types'
import { resolveColor, itemGradient, CATEGORY_EMOJI } from '@/lib/colors'

const CATEGORIES = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags', 'activewear', 'other']

export default function WardrobePanel({ initial }: { initial: WardrobeItem[] }) {
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = filter === 'all' ? items : items.filter(i => i.category === filter)

  function handleFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleAdd() {
    setLoading(true)
    try {
      const form = new FormData()
      if (mode === 'photo' && file) form.append('image', file)
      else if (mode === 'text' && description) form.append('description', description)
      else { toast.error('Add an image or description'); setLoading(false); return }

      const res = await fetch('/api/wardrobe', { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const item = await res.json()
      setItems(prev => [item, ...prev])
      toast.success('Item added to wardrobe')
      setOpen(false)
      setFile(null); setPreview(null); setDescription('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/wardrobe', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
    else toast.error('Failed to remove item')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} item{items.length !== 1 ? 's' : ''} in your wardrobe</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white text-sm px-3 h-8 font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-light">Add to wardrobe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant={mode === 'photo' ? 'default' : 'outline'} size="sm" onClick={() => setMode('photo')} className={mode === 'photo' ? 'bg-stone-800' : ''}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Photo
                </Button>
                <Button variant={mode === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setMode('text')} className={mode === 'text' ? 'bg-stone-800' : ''}>
                  <Type className="h-3.5 w-3.5 mr-1.5" /> Describe
                </Button>
              </div>

              {mode === 'photo' ? (
                <div
                  className="border-2 border-dashed border-stone-200 rounded-lg p-8 text-center cursor-pointer hover:border-stone-400 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onDragOver={e => e.preventDefault()}
                >
                  {preview ? (
                    <div className="relative h-40 w-full">
                      <Image src={preview} alt="Preview" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-stone-300 mx-auto" />
                      <p className="text-sm text-stone-400">Drop a photo or click to upload</p>
                      <p className="text-xs text-stone-300">JPG, PNG, WEBP up to 10MB</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Describe the item</Label>
                  <Textarea
                    placeholder="e.g. Cream linen blazer, slightly oversized, with patch pockets"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-stone-400">Be specific — color, fabric, fit, and style help Anticipa match it accurately.</p>
                </div>
              )}

              <Button onClick={handleAdd} disabled={loading} className="w-full bg-stone-800 hover:bg-stone-900">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing with AI…</> : 'Add to wardrobe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category filter */}
      {items.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.filter(c => c === 'all' || items.some(i => i.category === c)).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat] ?? ''} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-5xl">👔</div>
          <p className="text-stone-600 font-light">Your wardrobe is empty</p>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">Add photos or describe your clothes — Anticipa analyses each item automatically.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No {filter} items yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visible.map(item => (
            <WardrobeCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function WardrobeCard({ item, onDelete }: { item: WardrobeItem; onDelete: (id: string) => void }) {
  const emoji = CATEGORY_EMOJI[item.category?.toLowerCase() ?? ''] ?? '🛍️'
  const gradient = itemGradient(item.colors)

  return (
    <Card className="group border-stone-200 shadow-none overflow-hidden">
      <div className="relative aspect-[3/4] bg-stone-50">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.description || item.category} fill className="object-cover" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-3" style={{ background: gradient }}>
            <span className="text-6xl drop-shadow-sm">{emoji}</span>
            <span className="text-xs text-stone-600 capitalize font-medium text-center leading-snug">
              {item.subcategory || item.category}
            </span>
            {item.description && item.description !== 'Item added manually' && (
              <p className="text-[11px] text-stone-500 text-center leading-relaxed line-clamp-3 px-1">
                {item.description}
              </p>
            )}
          </div>
        )}
        {item.brand && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] bg-white/90 text-stone-600 px-1.5 py-0.5 rounded font-medium shadow-sm">{item.brand}</span>
          </div>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3 text-stone-600" />
        </button>
      </div>
      <CardContent className="p-3 space-y-1.5">
        <p className="text-xs font-semibold text-stone-700 capitalize leading-tight">
          {item.subcategory || item.category}
        </p>
        <div className="flex items-center gap-1.5">
          {item.colors.slice(0, 4).map(c => (
            <span
              key={c}
              title={c}
              className="inline-block h-3 w-3 rounded-full border border-stone-200 shrink-0"
              style={{ backgroundColor: resolveColor(c) }}
            />
          ))}
          {item.style_tags.slice(0, 1).map(t => (
            <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-400 capitalize border-stone-200 ml-auto">{t}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
