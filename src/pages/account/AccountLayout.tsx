import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Gift, Heart, Home, LogOut, MapPin, Package, RefreshCw, Settings } from 'lucide-react'
import { Container } from '@/components/site/Container'
import { PageHero, Loading } from '@/components/site/PageHero'
import { useAccount } from '@/lib/account'
import { cn } from '@/lib/utils'

const links = [
  { to: '/account', label: 'Overview', icon: Home, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/wishlist', label: 'Saved items', icon: Heart },
  { to: '/account/rewards', label: 'Rewards', icon: Gift },
  { to: '/account/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/billing', label: 'Payment & billing', icon: CreditCard },
  { to: '/account/settings', label: 'Settings', icon: Settings },
]

export function AccountLayout() {
  const { customer, loading, logout } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !customer) {
      navigate(`/account/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
    }
  }, [loading, customer, navigate, location.pathname])

  if (loading || !customer) return <Loading />

  return (
    <>
      <PageHero eyebrow="My account" title={customer.name ? `Hi, ${customer.name.split(' ')[0]}` : 'My account'}>
        <p className="mt-2 text-sm text-muted-foreground">{customer.email}</p>
      </PageHero>
      <Container className="grid gap-8 py-10 md:grid-cols-[220px_1fr]">
        <aside className="h-fit md:sticky md:top-24">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
                  )
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={async () => {
                await logout()
                navigate('/')
              }}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </Container>
    </>
  )
}
