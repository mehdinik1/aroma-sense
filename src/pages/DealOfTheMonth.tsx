import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from '@/components/site/PageHero'
import { useAsync, loadProducts } from '@/lib/store'

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** Resolves to whichever product is flagged the current month's Deal of the Month. */
export function DealOfTheMonth() {
  const { data, loading } = useAsync(loadProducts, [])

  useEffect(() => {
    document.title = 'Deal of the Month — Aroma Sense'
  }, [])

  if (loading || !data) return <Loading />

  const month = MONTHS[new Date().getMonth()]
  const deals = data.filter((p) => /deal of the month/i.test(p.title) || /deal-of-the-month/.test(p.handle))
  const current =
    deals.find((p) => new RegExp(month, 'i').test(p.title + p.handle)) ?? deals[0]

  if (current) return <Navigate to={`/products/${current.handle}`} replace />
  return <Navigate to="/collections/starter-kits" replace />
}
