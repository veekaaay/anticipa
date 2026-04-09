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

export default function WardrobePanel({ initial }: { initial: WardrobeItem[] }) {
  const [items, setItems] = useState(initial)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} items in your wardrobe</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white text-sm px-3 h-8 font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-light">Add to wardrobe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Mode toggle */}
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
                </div>
              )}

              <Button onClick={handleAdd} disabled={loading} className="w-full bg-stone-800 hover:bg-stone-900">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing with AI…</> : 'Add to wardrobe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="👔" text="Your wardrobe is empty" sub="Add photos or describe your clothes — Anticipa will analyse them automatically." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(item => (
            <WardrobeCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function WardrobeCard({ item, onDelete }: { item: WardrobeItem; onDelete: (id: string) => void }) {
  return (
    <Card className="group border-stone-200 shadow-none overflow-hidden">
      <div className="relative aspect-square bg-stone-100">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.description || item.category} fill className="object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center text-4xl">👔</div>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3 text-stone-600" />
        </button>
      </div>
      <CardContent className="p-2.5 space-y-1.5">
        <p className="text-xs font-medium text-stone-700 capitalize">{item.subcategory || item.category}</p>
        <div className="flex flex-wrap gap-1">
          {item.colors.slice(0, 2).map(c => (
            <Badge key={c} variant="secondary" className="text-[10px] py-0 px-1.5 bg-stone-100 text-stone-600 capitalize">{c}</Badge>
          ))}
          {item.style_tags.slice(0, 1).map(t => (
            <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-500 capitalize">{t}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="text-5xl">{icon}</div>
      <p className="text-stone-600 font-light">{text}</p>
      <p className="text-stone-400 text-sm max-w-xs mx-auto">{sub}</p>
    </div>
  )
}
