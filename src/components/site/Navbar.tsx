import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react'
import { Container } from './Container'
import { Logo } from './Logo'
import { nav, type NavItem } from '@/data/site'
import { useCart } from '@/lib/cart'
import { useAccount } from '@/lib/account'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function Navbar({ onOpenCart }: { onOpenCart: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [openMega, setOpenMega] = useState<string | null>(null)
  const { count } = useCart()
  const { customer } = useAccount()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setSearchOpen(false)
      setSearchTerm('')
    }
  }

  const active = nav.find((n) => n.label === openMega && n.sections)

  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-background/95 backdrop-blur">
      <div className="border-b border-primary/15 bg-card py-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        Complimentary shipping across the United States
      </div>

      <div className="relative" onMouseLeave={() => setOpenMega(null)}>
        <Container className="flex h-16 items-center justify-between gap-3">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex">
            {nav.map((item) => (
              <div key={item.label} onMouseEnter={() => setOpenMega(item.sections ? item.label : null)}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/80 transition-colors hover:text-primary',
                      (isActive || openMega === item.label) && 'text-primary',
                    )
                  }
                >
                  {item.label}
                  {item.sections && (
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', openMega === item.label && 'rotate-180')}
                    />
                  )}
                </NavLink>
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2.5 hover:bg-secondary"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="rounded-full p-2.5 hover:bg-secondary"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="group relative hidden sm:block">
              <Link
                to={customer ? '/account' : '/account/login'}
                className="flex items-center rounded-full p-2.5 hover:bg-secondary"
                aria-label={customer ? 'My account' : 'Sign in'}
              >
                <User className="h-5 w-5" />
              </Link>
              <div className="invisible absolute right-0 top-full min-w-44 rounded-lg border border-border bg-card p-1.5 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                {customer ? (
                  <>
                    <Link to="/account" className="block rounded px-3 py-2 text-xs uppercase tracking-wide hover:bg-secondary">
                      Overview
                    </Link>
                    <Link to="/account/orders" className="block rounded px-3 py-2 text-xs uppercase tracking-wide hover:bg-secondary">
                      Orders
                    </Link>
                    <Link to="/account/rewards" className="block rounded px-3 py-2 text-xs uppercase tracking-wide hover:bg-secondary">
                      Rewards
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/account/login" className="block rounded px-3 py-2 text-xs uppercase tracking-wide hover:bg-secondary">
                      Sign in
                    </Link>
                    <Link to="/account/register" className="block rounded px-3 py-2 text-xs uppercase tracking-wide hover:bg-secondary">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onOpenCart}
              className="relative rounded-full p-2.5 hover:bg-secondary"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-full p-2.5 hover:bg-secondary lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </Container>

        {/* Mega menu */}
        {active && <MegaMenu item={active} onNavigate={() => setOpenMega(null)} />}
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-card">
          <Container className="py-3">
            <form onSubmit={submitSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products…"
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </form>
          </Container>
        </div>
      )}

      {mobileOpen && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-border bg-card lg:hidden">
          <Container className="flex flex-col py-3">
            {nav.map((item) => (
              <div key={item.label} className="border-b border-border/60 py-1 last:border-0">
                {item.sections ? (
                  <>
                    <button
                      onClick={() => setMobileSection(mobileSection === item.label ? null : item.label)}
                      className="flex w-full items-center justify-between py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"
                    >
                      {item.label}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', mobileSection === item.label && 'rotate-180')}
                      />
                    </button>
                    {mobileSection === item.label && (
                      <div className="pb-2">
                        {item.sections.map((sec) => (
                          <div key={sec.title} className="mt-1">
                            <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                              {sec.title}
                            </p>
                            <div className="flex flex-col">
                              {sec.links.map((l) => (
                                <Link
                                  key={l.label}
                                  to={l.to}
                                  onClick={() => setMobileOpen(false)}
                                  className="py-1.5 pl-3 text-xs uppercase tracking-[0.06em] text-muted-foreground"
                                >
                                  {l.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <Link
              to={customer ? '/account' : '/account/login'}
              onClick={() => setMobileOpen(false)}
              className="mt-2 block py-3 text-xs font-semibold uppercase tracking-[0.1em] text-primary"
            >
              {customer ? 'My account' : 'Sign in / Create account'}
            </Link>
          </Container>
        </div>
      )}
    </header>
  )
}

function MegaMenu({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <div className="absolute inset-x-0 top-full z-50 hidden animate-[fade-up_.18s_ease-out] border-b border-primary/20 bg-background shadow-2xl shadow-black/60 lg:block">
      <div className="rule-gold" />
      <Container className="flex gap-12 py-9">
        <div
          className="grid flex-1 gap-x-10 gap-y-6"
          style={{ gridTemplateColumns: `repeat(${item.sections!.length}, minmax(0, 1fr))` }}
        >
          {item.sections!.map((sec) => (
            <div key={sec.title}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {sec.title}
              </p>
              <ul className="space-y-3">
                {sec.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} onClick={onNavigate} className="group block">
                      <span className="font-display text-[15px] text-foreground transition-colors group-hover:text-primary">
                        {l.label}
                      </span>
                      {l.note && (
                        <span className="mt-0.5 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          {l.note}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {item.feature && (
          <Link
            to={item.feature.to}
            onClick={onNavigate}
            className="group flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-primary/20"
          >
            <div className="photo-tile aspect-[4/3] overflow-hidden">
              <img
                src={item.feature.image}
                alt={item.feature.title}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {item.feature.eyebrow}
              </span>
              <p className="mt-1.5 font-display text-base leading-snug text-foreground">
                {item.feature.title}
              </p>
              <span className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                {item.feature.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        )}
      </Container>
    </div>
  )
}
