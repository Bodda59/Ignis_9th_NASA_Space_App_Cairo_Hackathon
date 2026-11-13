import { RevealText } from '@/components/fx/RevealText'

/** Temporary page until each view is built (page-by-page plan). */
export function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <section className="mx-auto flex min-h-[80svh] max-w-[1440px] flex-col justify-center px-6 pt-24 lg:px-10">
      <p className="label mb-5">Coming next</p>
      <RevealText
        lines={[title]}
        className="font-display text-[clamp(3rem,9vw,8rem)] font-semibold uppercase leading-none tracking-[-0.04em]"
      />
      <p className="mt-6 max-w-md text-sm text-[var(--color-ink-dim)]">{note}</p>
    </section>
  )
}
