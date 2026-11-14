import { useEffect, useRef } from 'react'
import { getTheme } from '@/lib/theme'

/** Sparse, slowly drifting starfield with depth parallax on pointer move. */
export function Starfield({ density = 0.00012, className = '' }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0
    let stars: { x: number; y: number; z: number; tw: number }[] = []
    const m = { x: 0, y: 0, tx: 0, ty: 0 }

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: Math.round(w * h * density) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() ** 2,
        tw: Math.random() * Math.PI * 2,
      }))
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const onMove = (e: PointerEvent) => {
      m.tx = e.clientX / innerWidth - 0.5
      m.ty = e.clientY / innerHeight - 0.5
    }
    addEventListener('pointermove', onMove)

    const draw = (time: number) => {
      m.x += (m.tx - m.x) * 0.04
      m.y += (m.ty - m.y) * 0.04
      ctx.clearRect(0, 0, w, h)
      // Light theme: faint navy dots, like a printed star chart (white stars would vanish).
      const light = canvas.closest('.space-window') === null && getTheme() === 'light'
      for (const s of stars) {
        if (!reduced) s.y -= 0.02 + s.z * 0.06
        if (s.y < -2) s.y = h + 2
        const px = s.x - m.x * 30 * s.z
        const py = s.y - m.y * 30 * s.z
        const a = 0.25 + s.z * 0.6 + Math.sin(time / 900 + s.tw) * 0.15
        ctx.fillStyle = light ? `rgba(10,26,58,${a * 0.6})` : `rgba(220,228,255,${a})`
        ctx.fillRect(px, py, 0.6 + s.z * 1.1, 0.6 + s.z * 1.1)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      removeEventListener('pointermove', onMove)
    }
  }, [density])

  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />
}
