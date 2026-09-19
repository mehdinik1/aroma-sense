import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { abs, HOME_DESCRIPTION, ogImage, isNoindexPath, normalizePath, SITE_NAME, staticSeo, type SeoInput } from './seoShared'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applySeo(o: SeoInput) {
  const image = ogImage(o.image)
  const url = abs(o.path)
  document.title = o.title
  setMeta('name', 'description', o.description)
  setMeta('property', 'og:title', o.title)
  setMeta('property', 'og:description', o.description)
  setMeta('property', 'og:type', o.type ?? 'website')
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)
  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', o.title)
  setMeta('name', 'twitter:description', o.description)
  setMeta('name', 'twitter:image', image)

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url

  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (o.noindex) setMeta('name', 'robots', 'noindex,follow')
  else robots?.remove()

  const ld = document.getElementById('seo-jsonld')
  if (o.jsonLd?.length) {
    const script = ld ?? Object.assign(document.createElement('script'), { id: 'seo-jsonld', type: 'application/ld+json' })
    script.textContent = JSON.stringify(o.jsonLd.length === 1 ? o.jsonLd[0] : o.jsonLd)
    if (!ld) document.head.appendChild(script)
  } else {
    ld?.remove()
  }
}

/** Dynamic pages call this once their data has loaded (pass null while loading). */
export function useSeo(input: SeoInput | null) {
  const key = input ? JSON.stringify(input) : ''
  useEffect(() => {
    if (input) applySeo(input)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Keeps tags correct for fixed-copy pages and marks private areas noindex on every navigation. */
export function RouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = normalizePath(pathname)
    const s = staticSeo(path)
    if (s) applySeo(s)
    else if (isNoindexPath(path))
      applySeo({ title: SITE_NAME, description: HOME_DESCRIPTION, path, noindex: true })
  }, [pathname])
  return null
}
