import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Logo } from '@/components/site/Logo'
import { api, ApiError } from '@/lib/api'

export function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.admin.me().then(() => navigate('/admin', { replace: true })).catch(() => undefined)
  }, [navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.admin.login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary/40 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Store admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage products and orders.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
