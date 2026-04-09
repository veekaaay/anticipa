'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Upload, Type, Trash2, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
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
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'
interface FileEntry {
  file: File
  preview: string
  status: FileStatus
}

export default function WardrobePanel({ initial }: { initial: WardrobeItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = filter === 'all' ? items : items.filter(i => i.category === filter)

  // Backfill images for existing items that have none
  useEffect(() => {
    const hasItemsWithNoImage = items.some(i => !i.image_url)
    if (!hasItemsWithNoImage) return
    fetch('/api/wardrobe/backfill-images', { method: 'POST' })
      .then(r => r.json())
      .then(({ updated }) => {
        if (updated > 0) {
          fetch('/api/wardrobe')
            .then(r => r.json())
            .then(fresh => setItems(fresh))
            .catch(() => {})
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_BYTES)
    const invalid = incoming.length - valid.length
    if (invalid > 0) toast.error(`${invalid} file${invalid > 1 ? 's' : ''} skipped — must be JPG/PNG/WEBP under 10 MB`)
    if (!valid.length) return
    const newEntries: FileEntry[] = valid.map(f => ({ file: f, preview: URL.createObjectURL(f), status: 'pending' }))
    setEntries(prev => [...prev, ...newEntries])
  }

  function removeEntry(index: number) {
    setEntries(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function resetDialog() {
    setEntries(prev => { prev.forEach(e => URL.revokeObjectURL(e.preview)); return [] })
    setDescription('')
  }

  async function uploadOne(entry: FileEntry, index: number): Promise<WardrobeItem | null> {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'uploading' } : e))
    try {
      const form = new FormData()
      form.append('image', entry.file)
      const res = await fetch('/api/wardrobe', { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const item: WardrobeItem = await res.json()
      setEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'done' } : e))
      setItems(prev => [item, ...prev])
      return item
    } catch {
      setEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'error' } : e))
      return null
    }
  }

  async function handleAddPhotos() {
    if (!entries.length) { toast.error('Select at least one photo'); return }
    setUploading(true)
    const results = await Promise.allSettled(entries.map((e, i) => uploadOne(e, i)))
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null).length
    const failed = entries.length - succeeded
    setUploading(false)

    if (succeeded > 0) {
      toast.success(`${succeeded} item${succeeded > 1 ? 's' : ''} added to wardrobe${failed > 0 ? `, ${failed} failed` : ''}`)
      router.refresh()
    } else {
      toast.error('All uploads failed — check your files and try again')
    }

    if (failed === 0) {
      setOpen(false)
      resetDialog()
    }
    // If some failed, keep dialog open so user can see which ones failed
  }

  async function handleAddText() {
    if (!description.trim()) { toast.error('Add a description'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('description', description)
      const res = await fetch('/api/wardrobe', { method: 'POST', body: form })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const item = await res.json()
      setItems(prev => [item, ...prev])
      toast.success('Item added to wardrobe')
      setOpen(false)
      resetDialog()
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = entries.filter(e => e.status === 'pending').length
  const allDone = entries.length > 0 && entries.every(e => e.status === 'done' || e.status === 'error')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} item{items.length !== 1 ? 's' : ''} in your wardrobe</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetDialog() }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white text-sm px-3 h-8 font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-light">Add to wardrobe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button variant={mode === 'photo' ? 'default' : 'outline'} size="sm" onClick={() => setMode('photo')} className={mode === 'photo' ? 'bg-stone-800' : ''}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Photos
                </Button>
                <Button variant={mode === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setMode('text')} className={mode === 'text' ? 'bg-stone-800' : ''}>
                  <Type className="h-3.5 w-3.5 mr-1.5" /> Describe
                </Button>
              </div>

              {mode === 'photo' ? (
                <div className="space-y-3">
                  {/* Drop zone — always visible so more files can be added */}
                  <div
                    className="border-2 border-dashed border-stone-200 rounded-lg p-5 text-center cursor-pointer hover:border-stone-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)) }}
                    onDragOver={e => e.preventDefault()}
                  >
                    <Upload className="h-6 w-6 text-stone-300 mx-auto mb-1.5" />
                    <p className="text-sm text-stone-400">Drop photos or click to select</p>
                    <p className="text-xs text-stone-300 mt-0.5">JPG, PNG, WEBP · up to 10 MB each · multiple allowed</p>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }}
                    />
                  </div>

                  {/* Thumbnail grid */}
                  {entries.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-0.5">
                      {entries.map((entry, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-stone-100 group">
                          <Image src={entry.preview} alt={`Photo ${i + 1}`} fill className="object-cover" />

                          {/* Status overlay */}
                          {entry.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="h-5 w-5 text-white animate-spin" />
                            </div>
                          )}
                          {entry.status === 'done' && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                            </div>
                          )}
                          {entry.status === 'error' && (
                            <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-red-300" />
                            </div>
                          )}

                          {/* Remove button — only when not in flight */}
                          {entry.status !== 'uploading' && !allDone && (
                            <button
                              onClick={() => removeEntry(i)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {entries.length > 0 && (
                    <p className="text-xs text-stone-400">
                      {allDone
                        ? `${entries.filter(e => e.status === 'done').length} added · ${entries.filter(e => e.status === 'error').length} failed`
                        : `${entries.length} photo${entries.length > 1 ? 's' : ''} selected`}
                    </p>
                  )}

                  <Button
                    onClick={handleAddPhotos}
                    disabled={uploading || entries.length === 0 || allDone}
                    className="w-full bg-stone-800 hover:bg-stone-900"
                  >
                    {uploading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing with AI…</>
                      : entries.length > 1
                      ? `Add ${pendingCount || entries.length} item${(pendingCount || entries.length) !== 1 ? 's' : ''} to wardrobe`
                      : 'Add to wardrobe'}
                  </Button>
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
                  <Button onClick={handleAddText} disabled={uploading} className="w-full bg-stone-800 hover:bg-stone-900 mt-1">
                    {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing with AI…</> : 'Add to wardrobe'}
                  </Button>
                </div>
              )}
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

  async function handleDelete(id: string) {
    const res = await fetch('/api/wardrobe', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })
    if (res.ok) { setItems(prev => prev.filter(i => i.id !== id)); router.refresh() }
    else toast.error('Failed to remove item')
  }
}

function WardrobeCard({ item, onDelete }: { item: WardrobeItem; onDelete: (id: string) => void }) {
  const emoji = CATEGORY_EMOJI[item.category?.toLowerCase() ?? ''] ?? '🛍️'
  const gradient = itemGradient(item.colors)

  return (
    <Card className="group border-stone-200 shadow-none overflow-hidden">
      {/* Visual area */}
      <div className={`relative ${item.image_url ? 'aspect-[3/4]' : ''}`}>
        {item.image_url ? (
          <>
            <Image
              src={item.image_url}
              alt={item.description || item.category}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            {item.brand && (
              <div className="absolute bottom-2 left-2">
                <span className="text-[10px] bg-white/90 text-stone-600 px-1.5 py-0.5 rounded font-medium shadow-sm">{item.brand}</span>
              </div>
            )}
          </>
        ) : (
          <div
            className="flex items-center justify-center py-8"
            style={{ background: gradient }}
          >
            <span className="text-6xl drop-shadow-sm">{emoji}</span>
          </div>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3 text-stone-600" />
        </button>
      </div>

      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold text-stone-700 capitalize leading-tight">
          {item.subcategory || item.category}
        </p>
        {!item.image_url && item.description && item.description !== 'Item added manually' && (
          <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{item.description}</p>
        )}
        {item.brand && item.image_url && (
          <p className="text-[11px] text-stone-400 font-medium">{item.brand}</p>
        )}
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
