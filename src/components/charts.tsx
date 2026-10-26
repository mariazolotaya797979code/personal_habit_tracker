import { useId } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../store/app'

export function useChartColors() {
  const { dayTheme, dark } = useApp()
  return { a: dayTheme.accent, b: dayTheme.accent2, grid: dark ? 'rgba(255,255,255,.1)' : 'rgba(15,27,51,.1)', text: dark ? '#b4c3dd' : '#3b4a66' }
}

export function RingGauge({ value, label, size = 108, color }: { value: number; label: string; size?: number; color?: string }) {
  const id = useId().replace(/:/g, '')
  const c = useChartColors()
  const col = color ?? c.b
  const r = 42
  const len = 2 * Math.PI * r
  return (
    <figure className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value}%`}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".75" />
            <stop offset=".35" stopColor={col} />
            <stop offset="1" stopColor={col} />
          </linearGradient>
          <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodOpacity=".35" />
          </filter>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(127,127,127,.22)" strokeWidth="11" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={`url(#g${id})`} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${(len * Math.min(value, 100)) / 100} ${len}`} transform="rotate(-90 50 50)" filter={`url(#s${id})`}
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
        />
        <text x="50" y="56" textAnchor="middle" className="fill-[var(--ink)] text-[20px] font-black">{value}%</text>
      </svg>
      <figcaption className="text-soft mt-1 text-center text-xs font-extrabold">{label}</figcaption>
    </figure>
  )
}

export function AreaTrend({ data, dataKey, height = 220, unit = '' }: { data: { label: string; [k: string]: number | string }[]; dataKey: string; height?: number; unit?: string }) {
  const c = useChartColors()
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.b} stopOpacity=".65" />
            <stop offset="1" stopColor={c.b} stopOpacity="0.02" />
          </linearGradient>
          <filter id={`ls${id}`}><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={c.b} floodOpacity=".45" /></filter>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.text, fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
        <YAxis tick={{ fill: c.text, fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v}${unit}`, '']} separator="" cursor={{ stroke: c.b, strokeOpacity: 0.4 }} />
        <Area type="monotone" dataKey={dataKey} stroke={c.b} strokeWidth={3.5} fill={`url(#a${id})`} filter={`url(#ls${id})`} dot={false} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Bars({ data, dataKey, height = 220, unit = '', color }: { data: { label: string; [k: string]: number | string }[]; dataKey: string; height?: number; unit?: string; color?: string }) {
  const c = useChartColors()
  const col = color ?? c.a
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={col} />
            <stop offset=".35" stopColor="#fff" stopOpacity=".55" />
            <stop offset=".55" stopColor={col} />
            <stop offset="1" stopColor={col} stopOpacity=".8" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.text, fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tick={{ fill: c.text, fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v}${unit}`, '']} separator="" cursor={{ fill: c.grid }} />
        <Bar dataKey={dataKey} fill={`url(#b${id})`} radius={[10, 10, 4, 4]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, height = 240 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <defs>
          <filter id={`d${id}`}><feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity=".35" /></filter>
          <radialGradient id={`h${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity=".45" />
          </radialGradient>
        </defs>
        <Tooltip formatter={(v, n) => [`${v} отм.`, String(n)]} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="88%" paddingAngle={3} cornerRadius={8} stroke="none" filter={`url(#d${id})`} isAnimationActive>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
