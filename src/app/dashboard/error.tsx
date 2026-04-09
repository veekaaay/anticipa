'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-light text-stone-800">Something went wrong</h2>
        <p className="text-stone-500 text-sm mt-1">{error.message}</p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </div>
  )
}
