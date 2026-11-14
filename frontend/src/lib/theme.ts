import { useEffect, useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

/** Same key the inline script in index.html reads, so the saved theme applies before first paint. */
export const THEME_STORAGE_KEY = 'flame-in-freefall:theme'

/** Browser UI color (mobile address bar) for each theme; matches --color-void. */
const THEME_COLOR: Record<Theme, string> = { dark: '#08090e', light: '#c5cedd' }

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  try { localStorage.setItem(THEME_STORAGE_KEY, theme) }
  catch { /* This browser does not allow the theme preference to be saved. */ }
}

/** Calls `onChange` whenever the theme switches (the html data-theme attribute changes). */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

/**
 * Keeps the page dark while the calling component is mounted, without changing the saved
 * preference (Kids Lab has no light mode). The saved theme comes back on unmount.
 */
export function useForceDarkTheme() {
  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')
    root.dataset.theme = 'dark'
    meta?.setAttribute('content', THEME_COLOR.dark)
    return () => {
      let saved: Theme = 'dark'
      try { saved = localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark' }
      catch { /* storage unavailable: stay dark */ }
      root.dataset.theme = saved
      meta?.setAttribute('content', THEME_COLOR[saved])
    }
  }, [])
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'dark')
}

function subscribeFilm(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-film'] })
  return () => observer.disconnect()
}

/** True while the home page's opening film fills the screen (set by IntroFilm). */
export function useFilmCover(): boolean {
  return useSyncExternalStore(subscribeFilm, () => document.documentElement.dataset.film === 'on', () => false)
}
