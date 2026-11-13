export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-10 text-xs text-[var(--color-ink-faint)] lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p className="max-w-2xl leading-relaxed">
          A research and planning tool built on NASA Physical Science Informatics data. It does not provide
          emergency instructions and does not certify any material, habitat or condition as safe.
        </p>
        <p className="label">NASA Space Apps 2026 · Flame in Freefall</p>
      </div>
    </footer>
  )
}
