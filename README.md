# Anticipa

> Shop smarter. Wear better.

AI-powered personal stylist that learns your wardrobe and wishlist, then curates exactly what to buy next — with real deals attached.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth + DB + Storage | Supabase |
| AI | Google Gemini 2.0 Flash (free) |
| Deals | SerpAPI — Google Shopping |
| Wishlist import | Cheerio scraper |
| Hosting | Vercel |

## Setup

### 1. Clone and install
```bash
git clone https://github.com/veekaaay/anticipa.git
cd anticipa
npm install
cp .env.example .env.local   # then fill in your keys
```

### 2. Keys needed

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `GEMINI_API_KEY` | aistudio.google.com (free) |
| `SERPAPI_KEY` | serpapi.com (100 free/month, optional) |

### 3. Supabase schema
Run `src/lib/supabase/schema.sql` in your Supabase SQL Editor.

### 4. Run
```bash
npm run dev        # local
vercel deploy      # production
```

## How it works

1. Upload wardrobe photos or describe clothes → Gemini extracts style data
2. Paste a Pinterest board or Amazon wishlist URL → scraped and enriched
3. Hit "Generate picks" → Gemini analyses gaps, cross-refs wishlist, returns 6 ranked picks with reasons + real deal links via SerpAPI
