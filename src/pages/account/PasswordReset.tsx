import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link to="/account/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </Container>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.account.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
    setBusy(false)
  }

  return (
    <Shell title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <p className="mt-6 rounded-xl bg-secondary/40 p-4 text-sm">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. It's valid for 1 hour.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'One moment…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.account.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
    setBusy(false)
  }

  return (
    <Shell title="Choose a new password" subtitle="Pick something at least 8 characters long.">
      {done ? (
        <p className="mt-6 rounded-xl bg-secondary/40 p-4 text-sm">Your password has been updated. You can sign in now.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !token}>
            {busy ? 'One moment…' : 'Update password'}
          </Button>
        </form>
      )}
    </Shell>
  )
}
