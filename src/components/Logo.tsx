import { Smiley } from './HabitCheck'
import { cx } from './ui'

export function Logo({ compact, light }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {compact && <span className="sr-only xs:hidden">Лучше, чем вчера</span>}
      <span className="ball relative h-10 w-10 flex-none" style={{ ['--c' as string]: '#ffc21a' }}>
        <Smiley className="absolute inset-0 h-full w-full" />
      </span>
      <span className={cx('min-w-0 leading-tight', compact && 'hidden xs:block', light && 'text-white')}>
        <span className="block truncate text-lg font-black">Лучше, чем вчера</span>
        {!compact && <span className={cx('block text-xs font-bold', light ? 'text-white/80' : 'text-soft')}>трекер привычек</span>}
      </span>
    </span>
  )
}
