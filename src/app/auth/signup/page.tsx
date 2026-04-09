'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
        data: { username: username.trim() || null },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <Card className="w-full max-w-md border-stone-200 shadow-sm text-center p-8">
        <Sparkles className="h-8 w-8 text-stone-700 mx-auto mb-4" />
        <h2 className="text-xl font-light text-stone-800 mb-2">Check your email</h2>
        <p className="text-stone-500 text-sm">We sent a confirmation link to <strong>{email}</strong></p>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="h-6 w-6 text-stone-700" />
          <span className="text-2xl font-light tracking-[0.2em] text-stone-800">ANTICIPA</span>
        </div>
        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-stone-800 font-light">Create your profile</CardTitle>
            <CardDescription>Start building your style identity</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="username">Your name</Label>
                <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Alex" maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" minLength={8} />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full bg-stone-800 hover:bg-stone-900" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </Button>
              <p className="text-sm text-stone-500">
                Already have one?{' '}
                <Link href="/auth/login" className="text-stone-800 underline underline-offset-2">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
