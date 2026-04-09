'use client'
import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { StyleProfile } from '@/types'

const STYLE_OPTIONS = [
  'casual', 'minimalist', 'streetwear', 'bohemian', 'preppy',
  'formal', 'business', 'athletic', 'vintage', 'luxury', 'smart-casual', 'evening',
]

const COLOR_OPTIONS = [
  { name: 'black', hex: '#1c1917' },
  { name: 'white', hex: '#fafaf9' },
  { name: 'cream', hex: '#fef9ef' },
  { name: 'beige', hex: '#e8d5b7' },
  { name: 'camel', hex: '#c19a6b' },
  { name: 'brown', hex: '#78350f' },
  { name: 'grey', hex: '#6b7280' },
  { name: 'navy', hex: '#1e3a5f' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#16a34a' },
  { name: 'olive', hex: '#6b7c3a' },
  { name: 'red', hex: '#dc2626' },
  { name: 'pink', hex: '#ec4899' },
  { name: 'purple', hex: '#9333ea' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'orange', hex: '#f97316' },
  { name: 'rust', hex: '#c2410c' },
  { name: 'burgundy', hex: '#7f1d1d' },
]

const CATEGORY_OPTIONS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags', 'activewear']

const GENDER_OPTIONS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
]

interface Props {
  initial: StyleProfile | null
}

export default function StyleProfilePanel({ initial }: Props) {
  const [gender, setGender] = useState(initial?.gender ?? 'unisex')
  const [budgetMin, setBudgetMin] = useState(initial?.budget_min?.toString() ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [budgetMax, setBudgetMax] = useState(initial?.budget_max?.toString() ?? '')
  const [styles, setStyles] = useState<string[]>(initial?.dominant_styles ?? [])
  const [colors, setColors] = useState<string[]>(initial?.color_palette ?? [])
  const [categories, setCategories] = useState<string[]>(initial?.preferred_categories ?? [])
  const [saving, setSaving] = useState(false)

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim() || null,
          gender,
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          dominant_styles: styles,
          color_palette: colors,
          preferred_categories: categories,
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error)
      }
      toast.success('Style profile saved')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Username */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Your name</Label>
        <Input
          placeholder="e.g. Alex"
          value={username}
          onChange={e => setUsername(e.target.value)}
          maxLength={40}
          className="max-w-xs"
        />
        <p className="text-xs text-stone-400">Shown on your dashboard greeting.</p>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Shopping for</Label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                gender === opt.value
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Budget per item</Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
            <input
              type="number"
              placeholder="Min"
              value={budgetMin}
              onChange={e => setBudgetMin(e.target.value)}
              className="w-28 pl-7 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>
          <span className="text-stone-400 text-sm">to</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
            <input
              type="number"
              placeholder="Max"
              value={budgetMax}
              onChange={e => setBudgetMax(e.target.value)}
              className="w-28 pl-7 pr-3 py-2 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>
        </div>
      </div>

      {/* Favourite styles */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Favourite styles</Label>
        <p className="text-xs text-stone-400">Pick all that apply</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStyles(prev => toggle(prev, s))}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                styles.includes(s)
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {styles.includes(s) && <Check className="inline h-3 w-3 mr-1" />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Favourite colours */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Favourite colours</Label>
        <p className="text-xs text-stone-400">Select the colours you wear most</p>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.name}
              onClick={() => setColors(prev => toggle(prev, c.name))}
              title={c.name}
              className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                colors.includes(c.name)
                  ? 'border-stone-800 scale-110 shadow-sm'
                  : 'border-stone-200 hover:border-stone-400'
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {colors.includes(c.name) && (
                <Check
                  className="absolute inset-0 m-auto h-3.5 w-3.5"
                  style={{ color: ['white', 'cream', 'beige', 'yellow'].includes(c.name) ? '#1c1917' : '#fff' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred categories */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Categories you shop most</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategories(prev => toggle(prev, cat))}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                categories.includes(cat)
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-stone-800 hover:bg-stone-900 min-w-[120px]">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save profile'}
        </Button>
        <p className="text-xs text-stone-400 mt-2">Your profile is used to personalise Picks.</p>
      </div>
    </div>
  )
}
