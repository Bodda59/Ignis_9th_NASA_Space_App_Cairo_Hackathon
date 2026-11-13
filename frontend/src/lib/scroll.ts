import type Lenis from 'lenis'

let lenis: Lenis | null = null
export const setLenis = (l: Lenis | null) => {
  lenis = l
}

/** Smooth-scroll to an element, cooperating with Lenis when active. */
export function scrollToEl(
  el: Element | null,
  offset = -96,
  opts: { duration?: number; easing?: (t: number) => number } = {},
) {
  if (!el) return
  if (lenis) {
    lenis.resize() // content may have just grown (e.g. a new chat turn) — refresh the scroll limit first
    lenis.scrollTo(el as HTMLElement, { offset, duration: opts.duration ?? 1.1, easing: opts.easing, force: true })
  }
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
}

/**
 * Frame-driven scroll to an element with our own easing and duration (used for the
 * "dive into the site" transition). Any wheel / touch / key input cancels it.
 */
export function diveTo(el: Element | null, seconds: number, easing: (t: number) => number) {
  if (!el) return
  const from = window.scrollY
  const to = el.getBoundingClientRect().top + window.scrollY
  const start = performance.now()
  let raf = 0
  const cancel = () => { cancelAnimationFrame(raf); stop() }
  const stop = () => {
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchstart', cancel)
    window.removeEventListener('keydown', cancel)
  }
  window.addEventListener('wheel', cancel, { passive: true })
  window.addEventListener('touchstart', cancel, { passive: true })
  window.addEventListener('keydown', cancel)
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / (seconds * 1000))
    const y = from + (to - from) * easing(t)
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo(0, y)
    if (t < 1) raf = requestAnimationFrame(step)
    else stop()
  }
  raf = requestAnimationFrame(step)
}
