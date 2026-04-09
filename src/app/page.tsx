import Link from 'next/link'
import { Sparkles, Shirt, Heart, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const features = [
    { icon: Shirt, title: 'Wardrobe Analysis', desc: 'Upload photos or describe your clothes. Anticipa reads every item with AI — colors, style, category.' },
    { icon: Heart, title: 'Wishlist Import', desc: 'Paste a Pinterest board or Amazon wishlist URL. We extract the items and map your desires.' },
    { icon: Sparkles, title: 'Style Intelligence', desc: 'We cross-reference what you own and what you want to build a fingerprint of your real style.' },
    { icon: ShoppingBag, title: 'Curated Picks + Deals', desc: "Get a ranked shopping list with reasons — and real prices. No noise, just what you'll actually wear." },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-stone-700" />
          <span className="text-xl font-light tracking-[0.2em] text-stone-800">ANTICIPA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"><Button variant="ghost" size="sm" className="text-stone-600">Sign in</Button></Link>
          <Link href="/auth/signup"><Button size="sm" className="bg-stone-800 hover:bg-stone-900">Get started</Button></Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-full px-4 py-1.5 text-xs text-stone-600 mb-8">
          <Sparkles className="h-3 w-3" /> AI-powered personal stylist
        </div>
        <h1 className="text-5xl sm:text-6xl font-light text-stone-800 tracking-tight leading-tight mb-6">
          Shop smarter.<br /><span className="text-stone-400">Wear better.</span>
        </h1>
        <p className="text-lg text-stone-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Anticipa learns your wardrobe and wishlist, then tells you exactly what to buy next — and where to find it for less.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="bg-stone-800 hover:bg-stone-900 gap-2 px-8">
              Start for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="border-stone-300 text-stone-600 px-8">Sign in</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-stone-200 rounded-xl p-6 space-y-3">
              <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-stone-600" />
              </div>
              <h3 className="font-medium text-stone-800">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-light text-stone-800 mb-4">Your next favourite piece is out there.</h2>
        <p className="text-stone-500 mb-8">Anticipa finds it before you know you need it.</p>
        <Link href="/auth/signup">
          <Button size="lg" className="bg-stone-800 hover:bg-stone-900 gap-2">
            Build your style profile <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Anticipa. Built with AI.
      </footer>
    </div>
  )
}
