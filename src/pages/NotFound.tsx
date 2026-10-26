import { Link } from 'react-router-dom'
import { Background } from '../components/Background'
import { Smiley } from '../components/HabitCheck'
import { useApp } from '../store/app'

export function NotFound({ inApp }: { inApp?: boolean }) {
  const { dayIndex, user } = useApp()
  return (
    <div className={inApp ? 'py-10' : 'flex min-h-dvh items-center justify-center px-3 py-10'}>
      {!inApp && <Background index={dayIndex} />}
      <div className="glass-strong glass-sheen pop-in mx-auto w-full max-w-lg rounded-[32px] p-8 text-center">
        <div className="flex items-center justify-center gap-1 text-[110px] font-black leading-none" aria-hidden>
          <span className="hero-title">4</span>
          <span className="ball bob relative inline-block h-24 w-24" style={{ ['--c' as string]: '#ff4d4d' }}>
            <Smiley sad className="absolute inset-0 h-full w-full" />
          </span>
          <span className="hero-title">4</span>
        </div>
        <h1 className="mt-4 text-2xl font-black">Такой страницы нет</h1>
        <p className="text-soft mt-2 font-semibold">Похоже, этот шарик укатился. Зато у нас много других полезных страниц!</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={user ? '/app' : '/'} className="btn btn-primary">{user ? 'К задачам на сегодня' : 'На главную'}</Link>
          <button type="button" className="btn btn-ghost" onClick={() => history.back()}>Назад</button>
        </div>
      </div>
    </div>
  )
}
