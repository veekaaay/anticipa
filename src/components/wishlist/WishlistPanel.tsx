'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Plus, Link2, Trash2, Loader2, ExternalLink } from 'lucide-react'
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
  const [items, setItems] = useState(initial)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleImport() {
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
      setUrl('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to import')
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
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
    else toast.error('Failed to remove item')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{items.length} items on your wishlist</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white text-sm px-3 h-8 font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Import
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-light">Import wishlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm text-stone-500 bg-stone-50 rounded-lg p-3">
                <div>📌 Pinterest board URL</div>
                <div>📦 Amazon wishlist URL</div>
                <div>🛍️ Any product page</div>
                <div>🔗 Any shopping URL</div>
              </div>
              <div className="space-y-1.5">
                <Label>Paste a URL</Label>
                <Input
                  placeholder="https://pinterest.com/username/board-name/"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleImport()}
                />
              </div>
              <Button onClick={handleImport} disabled={loading || !url.trim()} className="w-full bg-stone-800 hover:bg-stone-900">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing &amp; analysing…</> : 'Import items'}
              </Button>
              <p className="text-xs text-stone-400 text-center">
                Anticipa reads the items and enriches them with style tags automatically.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🛍️</div>
          <p className="text-stone-600 font-light">Your wishlist is empty</p>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">
            Import from Pinterest boards, Amazon wishlists, or any shopping page URL.
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
    <Card className="group border-stone-200 shadow-none overflow-hidden">
      <div className="relative h-40 bg-stone-100">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center text-4xl">🛍️</div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-[10px] bg-white/90 text-stone-600">
            {SOURCE_LABELS[item.source] || '🔗'}
          </Badge>
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={item.source_url} target="_blank" rel="noopener noreferrer"
            className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-blue-50">
            <ExternalLink className="h-3 w-3 text-stone-600" />
          </a>
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
