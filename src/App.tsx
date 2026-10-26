import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { Loading } from './components/ui'
import { Landing } from './pages/Landing'
import { Forgot, Login, Register } from './pages/Auth'
import { NotFound } from './pages/NotFound'
import { Today } from './pages/Today'
import { useApp } from './store/app'

const Habits = lazy(() => import('./pages/Habits'))
const HabitForm = lazy(() => import('./pages/HabitForm'))
const Categories = lazy(() => import('./pages/Categories'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Stats = lazy(() => import('./pages/Stats'))
const HabitStats = lazy(() => import('./pages/HabitStats'))
const Profile = lazy(() => import('./pages/Profile'))

function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useApp()
  return user ? <Navigate to="/app" replace /> : <>{children}</>
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot" element={<GuestOnly><Forgot /></GuestOnly>} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Today />} />
          <Route path="habits" element={<Habits />} />
          <Route path="habits/new" element={<HabitForm />} />
          <Route path="habits/:id/edit" element={<HabitForm />} />
          <Route path="categories" element={<Categories />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="stats" element={<Stats />} />
          <Route path="stats/:id" element={<HabitStats />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound inApp />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
