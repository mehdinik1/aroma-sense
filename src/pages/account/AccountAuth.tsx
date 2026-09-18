import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { useAccount } from '@/lib/account'
import { ApiError } from '@/lib/api'

export function AccountAuth({ mode }: { mode: 'login' | 'register' }) {
  const { customer, login, register } = useAccount()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (customer) navigate(next, { replace: true })
  }, [customer, navigate, next])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') await register(email, password, name)
      else await login(email, password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          {mode === 'register' ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'register'
            ? 'Track orders, save addresses and earn Aroma Sense Rewards points.'
            : 'Welcome back.'}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && (
              <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
            )}
          </div>
          {mode === 'login' && (
            <p className="text-right text-sm">
              <Link to="/account/forgot" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'One moment…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <Link to={`/account/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link to={`/account/register?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </Container>
  )
}
