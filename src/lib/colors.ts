export const COLOR_MAP: Record<string, string> = {
  black: '#1c1917', white: '#fafaf9', grey: '#a8a29e', gray: '#a8a29e',
  navy: '#1e3a5f', blue: '#3b82f6', 'light blue': '#93c5fd', 'sky blue': '#7dd3fc',
  red: '#ef4444', pink: '#f472b6', 'hot pink': '#ec4899', rose: '#fb7185',
  green: '#22c55e', olive: '#6b7c45', sage: '#84a98c', mint: '#6ee7b7',
  brown: '#92400e', tan: '#c8a882', beige: '#e8dcc8', cream: '#fdf8f0',
  camel: '#c19a6b', khaki: '#c3b091', sand: '#d4b896',
  yellow: '#eab308', mustard: '#ca8a04', orange: '#f97316', coral: '#f87171',
  purple: '#a855f7', lavender: '#c4b5fd', burgundy: '#800020', wine: '#722f37',
  teal: '#0d9488', turquoise: '#06b6d4', copper: '#b45309', gold: '#d97706',
  silver: '#9ca3af', charcoal: '#374151', ivory: '#f5f0e8', mauve: '#c4a9b0',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  tops: '👕', bottoms: '👖', dresses: '👗', outerwear: '🧥',
  shoes: '👟', accessories: '💍', bags: '👜', activewear: '🏃',
  swimwear: '🩱', other: '🛍️',
}

export function resolveColor(name: string): string {
  return COLOR_MAP[name?.toLowerCase()?.trim()] ?? '#d6d3d1'
}

export function itemGradient(colors: string[]): string {
  const mapped = colors.slice(0, 2).map(c => resolveColor(c))
  if (!mapped.length) return 'linear-gradient(145deg, #f5f5f4 0%, #e7e5e4 100%)'
  if (mapped.length === 1) return `linear-gradient(145deg, ${mapped[0]}30 0%, ${mapped[0]}60 100%)`
  return `linear-gradient(145deg, ${mapped[0]}38 0%, ${mapped[1]}48 100%)`
}
