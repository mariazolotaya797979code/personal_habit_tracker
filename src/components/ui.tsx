import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx('glass glass-sheen rounded-[28px] p-5 sm:p-6', className)} {...rest}>
      {children}
    </As>
  )
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 pop-in">
      <div className="min-w-0">
        <h1 className="hero-title text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 font-semibold text-white/90 [text-shadow:0_2px_10px_rgba(0,30,80,.6)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Ball({ color, size = 44, children, className }: { color: string; size?: number; children?: ReactNode; className?: string }) {
  return (
    <span
      className={cx('ball inline-flex flex-none items-center justify-center', className)}
      style={{ ['--c' as string]: color, width: size, height: size, fontSize: size * 0.48 }}
    >
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">{children}</span>
    </span>
  )
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-center justify-between gap-4 py-2', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {description && <span className="text-soft block text-sm">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'focus-ring relative h-8 w-14 flex-none rounded-full border transition-colors duration-300',
          checked ? 'border-white/60 bg-accent-2' : 'border-black/10 bg-black/15 dark:border-white/15 dark:bg-white/10',
        )}
        style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,.3)' }}
      >
        <span
          className="ball absolute top-1/2 h-6 w-6 -translate-y-1/2 transition-[left] duration-300"
          style={{ ['--c' as string]: checked ? '#ffffff' : '#e2e8f0', left: checked ? 'calc(100% - 28px)' : '4px' }}
        />
      </button>
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, className, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" className={cx('inline-flex max-w-full flex-wrap gap-1 rounded-full bg-black/10 p-1 dark:bg-white/10', className)} style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,.18)' }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'focus-ring rounded-full font-extrabold transition-all',
            size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
            value === o.value ? 'bg-white text-slate-900 shadow-[0_4px_12px_-4px_rgba(0,0,0,.4),inset_0_1px_0_#fff] dark:bg-white/90' : 'text-soft hover:text-[var(--ink)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="inline-flex items-center gap-2" aria-label={label}>
      <button type="button" className="btn btn-ghost btn-icon text-xl" aria-label="Меньше" disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−</button>
      <input
        type="number"
        inputMode="numeric"
        className="field w-20 text-center font-extrabold [appearance:textfield]"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(clamp(n)) }}
      />
      <button type="button" className="btn btn-ghost btn-icon text-xl" aria-label="Больше" disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const on = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', on)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus(), 30)
    return () => { document.removeEventListener('keydown', on); document.body.style.overflow = overflow; prev?.focus?.() }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} className={cx('glass-strong sheet-up relative flex max-h-[92dvh] w-full flex-col rounded-t-[30px] sm:rounded-[30px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h2 className="text-xl font-black">{title}</h2>
          <button data-close type="button" onClick={onClose} className="btn btn-ghost btn-icon text-lg" aria-label="Закрыть">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 pb-5 sm:px-6 [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({ open, title, text, confirmLabel = 'Удалить', onConfirm, onClose, danger = true }: { open: boolean; title: string; text: ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button type="button" className={cx('btn', danger ? 'btn-primary btn-danger' : 'btn-primary')} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-soft">{text}</p>
    </Modal>
  )
}

type ToastTone = 'success' | 'error' | 'info'
interface Toast { id: number; text: ReactNode; tone: ToastTone; action?: { label: string; run: () => void } }
const ToastCtx = createContext<(text: ReactNode, tone?: ToastTone, action?: Toast['action']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: ReactNode, tone: ToastTone = 'success', action?: Toast['action']) => {
    const id = Date.now() + Math.random()
    setItems((p) => [...p.slice(-2), { id, text, tone, action }])
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), action ? 6000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-3" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="glass-strong pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 font-bold">
              <span aria-hidden>{t.tone === 'success' ? '✅' : t.tone === 'error' ? '⚠️' : '💡'}</span>
              <span className="min-w-0 flex-1">{t.text}</span>
              {t.action && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { t.action!.run(); setItems((p) => p.filter((x) => x.id !== t.id)) }}>{t.action.label}</button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-extrabold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm font-bold text-rose-600 dark:text-rose-400">{error}</span> : hint ? <span className="text-soft mt-1 block text-sm">{hint}</span> : null}
    </label>
  )
}

export function Loading() {
  return (
    <div className="grid place-items-center py-24" role="status" aria-label="Загрузка">
      <span className="ball bob h-14 w-14" />
    </div>
  )
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="bob mb-4 text-6xl drop-shadow-[0_10px_14px_rgba(0,0,0,.25)]">{emoji}</div>
      <h3 className="text-xl font-black">{title}</h3>
      {text && <p className="text-soft mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
