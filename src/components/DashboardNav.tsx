'use client'
import { Sparkles, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-stone-700" />
          <span className="text-lg font-light tracking-[0.2em] text-stone-800">ANTICIPA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-400 hidden sm:block">{userEmail}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-stone-500 hover:text-stone-800 gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>
    </nav>
  )
}
