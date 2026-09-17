import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type { Product, Variant } from './types'

export type CartLine = {
  variantId: number
  handle: string
  title: string
  variantTitle: string | null
  productType: string
  priceCents: number
  image: string | null
  quantity: number
  subscribe: boolean
}

type State = { lines: CartLine[] }

type Action =
  | { type: 'add'; product: Product; variant: Variant; quantity: number; subscribe: boolean }
  | { type: 'setQty'; variantId: number; quantity: number }
  | { type: 'setSubscribe'; variantId: number; subscribe: boolean }
  | { type: 'remove'; variantId: number }
  | { type: 'clear' }

const KEY = 'aroma-sense-cart-v1'

function init(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const lines = JSON.parse(raw)
      if (Array.isArray(lines)) {
        return { lines: lines.map((l) => ({ subscribe: false, productType: '', ...l })) }
      }
    }
  } catch {
    /* ignore */
  }
  return { lines: [] }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => l.variantId === action.variant.id)
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.variantId === action.variant.id
              ? { ...l, quantity: l.quantity + action.quantity, subscribe: action.subscribe || l.subscribe }
              : l,
          ),
        }
      }
      return {
        lines: [
          ...state.lines,
          {
            variantId: action.variant.id,
            handle: action.product.handle,
            title: action.product.title,
            variantTitle: action.variant.title,
            productType: action.product.productType,
            priceCents: action.variant.priceCents,
            image: action.product.images[0] ?? null,
            quantity: action.quantity,
            subscribe: action.subscribe,
          },
        ],
      }
    }
    case 'setQty':
      return {
        lines: state.lines
          .map((l) => (l.variantId === action.variantId ? { ...l, quantity: Math.max(0, action.quantity) } : l))
          .filter((l) => l.quantity > 0),
      }
    case 'setSubscribe':
      return {
        lines: state.lines.map((l) =>
          l.variantId === action.variantId ? { ...l, subscribe: action.subscribe } : l,
        ),
      }
    case 'remove':
      return { lines: state.lines.filter((l) => l.variantId !== action.variantId) }
    case 'clear':
      return { lines: [] }
    default:
      return state
  }
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  /** raw subtotal ignoring subscription discounts */
  subtotalCents: number
  hasSubscription: boolean
  allSubscription: boolean
  mixed: boolean
  add: (product: Product, variant: Variant, quantity?: number, subscribe?: boolean) => void
  setQty: (variantId: number, quantity: number) => void
  setSubscribe: (variantId: number, subscribe: boolean) => void
  remove: (variantId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state.lines))
    } catch {
      /* ignore */
    }
  }, [state.lines])

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.quantity, 0)
    const subtotalCents = state.lines.reduce((n, l) => n + l.quantity * l.priceCents, 0)
    const subCount = state.lines.filter((l) => l.subscribe).length
    return {
      lines: state.lines,
      count,
      subtotalCents,
      hasSubscription: subCount > 0,
      allSubscription: state.lines.length > 0 && subCount === state.lines.length,
      mixed: subCount > 0 && subCount < state.lines.length,
      add: (product, variant, quantity = 1, subscribe = false) =>
        dispatch({ type: 'add', product, variant, quantity, subscribe }),
      setQty: (variantId, quantity) => dispatch({ type: 'setQty', variantId, quantity }),
      setSubscribe: (variantId, subscribe) => dispatch({ type: 'setSubscribe', variantId, subscribe }),
      remove: (variantId) => dispatch({ type: 'remove', variantId }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [state.lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
