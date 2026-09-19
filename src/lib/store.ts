import { useEffect, useState } from 'react'
import { api } from './api'
import type { Collection, Product, ReviewSummary, StoreConfig } from './types'

let productsCache: Promise<Product[]> | null = null
let collectionsCache: Promise<Collection[]> | null = null
let configCache: Promise<StoreConfig> | null = null
let reviewSummariesCache: Promise<Record<string, ReviewSummary>> | null = null

export function loadProducts() {
  if (!productsCache) productsCache = api.products()
  return productsCache
}

export function loadCollections() {
  if (!collectionsCache) collectionsCache = api.collections()
  return collectionsCache
}

export function loadConfig() {
  if (!configCache) configCache = api.config()
  return configCache
}

export function loadReviewSummaries() {
  if (!reviewSummariesCache) reviewSummariesCache = api.reviewSummaries().catch(() => ({}))
  return reviewSummariesCache
}

export function invalidateStore() {
  productsCache = null
  collectionsCache = null
}

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true, error: null })
    fn().then(
      (data) => alive && setState({ data, loading: false, error: null }),
      (err: Error) => alive && setState({ data: null, loading: false, error: err.message }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
