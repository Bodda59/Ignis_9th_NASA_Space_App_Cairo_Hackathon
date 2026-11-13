import type Lenis from 'lenis'

let lenis: Lenis | null = null
export const setLenis = (l: Lenis | null) => {
  lenis = l
}

/** Smooth-scroll to an element, cooperating with Lenis when active. */
export function scrollToEl(el: Element | null, offset = -96) {
  if (!el) return
  if (lenis) {
    lenis.resize() // content may have just grown (e.g. a new chat turn) — refresh the scroll limit first
    lenis.scrollTo(el as HTMLElement, { offset, duration: 1.1, force: true })
  }
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
}
