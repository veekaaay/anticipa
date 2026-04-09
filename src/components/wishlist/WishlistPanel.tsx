'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Trash2, Loader2, ExternalLink, Link2, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { WishlistItem } from '@/types'

const SOURCE_LABELS: Record<string, string> = {
  pinterest: '📌 Pinterest',
  amazon: '📦 Amazon',
  manual: '✏️ Manual',
  other: '🔗 Link',
}

export default function WishlistPanel({ initial }: { initial: WishlistItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'url' | 'manual'>('url')
  const [url, setUrl] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setUrl('')
    setManualTitle('')
    setManualUrl('')
    setManualPrice('')
  }

  async function handleImportUrl() {
    if (!url.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const newItems = await res.json()
      setItems(prev => [...newItems, ...prev])
      toast.success(`${newItems.length} item${newItems.length !== 1 ? 's' : ''} imported`)
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to import')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddManual() {
    if (!manualTitle.trim()) { toast.error('Add a title'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/wishlist/manual', {
        method: 'POST',
        body: JSON.stringify({
          title: manualTitle.trim(),
          source_url: manualUrl.trim() || null,
          price: manualPrice ? parseFloat(manualPrice) : null,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const item = await res.json()
      setItems(prev => [item, ...prev])
      toast.success('Item added to wishlist')
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/wishlist', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) { setItems(prev => prev.filter(i => i.id !== id)); router.refresh() }
    else toast.error('Failed to remove item')
  }

  const count = items.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{count} item{count !== 1 ? 's' : ''} on your wishlist</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white text-sm px-3 h-8 font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add item
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-light">Add to wishlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[calc(90vh-6rem)] overflow-y-auto pr-0.5">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button variant={mode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setMode('url')} className={mode === 'url' ? 'bg-stone-800' : ''}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" /> Import URL
                </Button>
                <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')} className={mode === 'manual' ? 'bg-stone-800' : ''}>
                  <PenLine className="h-3.5 w-3.5 mr-1.5" /> Add manually
                </Button>
              </div>

              {mode === 'url' ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm text-stone-500 bg-stone-50 rounded-lg p-3">
                    <div>📌 Pinterest board</div>
                    <div>📦 Amazon wishlist</div>
                    <div>🛍️ Any product page</div>
                    <div>🔗 Any shopping URL</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Paste a URL</Label>
                    <Input
                      placeholder="https://pinterest.com/username/board-name/"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleImportUrl()}
                    />
                  </div>
                  <Button onClick={handleImportUrl} disabled={loading || !url.trim()} className="w-full bg-stone-800 hover:bg-stone-900">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing &amp; analysing…</> : 'Import items'}
                  </Button>
                  <p className="text-xs text-stone-400 text-center">
                    Anticipa reads the items and enriches them with style tags automatically.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Item name <span className="text-red-400">*</span></Label>
                    <Input
                      placeholder="e.g. Acne Studios wool scarf in camel"
                      value={manualTitle}
                      onChange={e => setManualTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Link <span className="text-stone-400 font-normal">(optional)</span></Label>
                    <Input
                      placeholder="https://..."
                      value={manualUrl}
                      onChange={e => setManualUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price <span className="text-stone-400 font-normal">(optional)</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={manualPrice}
                        onChange={e => setManualPrice(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddManual} disabled={loading || !manualTitle.trim()} className="w-full bg-stone-800 hover:bg-stone-900">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing with AI…</> : 'Add to wishlist'}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🛍️</div>
          <p className="text-stone-600 font-light">Your wishlist is empty</p>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">
            Import from a URL or add items manually — Anticipa uses your wishlist to sharpen picks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <WishlistCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function WishlistCard({ item, onDelete }: { item: WishlistItem; onDelete: (id: string) => void }) {
  return (
    <Card className="group border-stone-200 shadow-none overflow-hidden p-0 gap-0">
      <div className="relative h-40 overflow-hidden bg-stone-100">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-4xl">🛍️</div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-[10px] bg-white/90 text-stone-600">
            {SOURCE_LABELS[item.source] || '🔗'}
          </Badge>
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-blue-50">
              <ExternalLink className="h-3 w-3 text-stone-600" />
            </a>
          )}
          <button onClick={() => onDelete(item.id)}
            className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-red-50">
            <Trash2 className="h-3 w-3 text-stone-600" />
          </button>
        </div>
      </div>
      <CardContent className="p-3 space-y-1.5">
        <p className="text-xs font-medium text-stone-700 line-clamp-2">{item.title}</p>
        <div className="flex items-center justify-between">
          {item.price ? (
            <span className="text-sm font-medium text-stone-800">${item.price.toFixed(2)}</span>
          ) : <span />}
          <div className="flex flex-wrap gap-1">
            {item.style_tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5 text-stone-500 capitalize">{t}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
