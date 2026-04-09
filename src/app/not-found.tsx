import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-stone-50 text-center px-4">
      <Sparkles className="h-8 w-8 text-stone-400" />
      <div>
        <h1 className="text-6xl font-light text-stone-800 mb-2">404</h1>
        <p className="text-stone-500">This page doesn&apos;t exist.</p>
      </div>
      <Link href="/"><Button variant="outline">Back home</Button></Link>
    </div>
  )
}
