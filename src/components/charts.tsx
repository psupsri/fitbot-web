import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Day } from '../api'
import type { Series } from '../series'
import { compact, num, thaiDate, thaiShort } from '../format'
import { IconChip } from './panels'

// สเปกของ mark ตาม dataviz: แท่งไม่เกิน 24px ปลายมน 4px เส้น 2px จุด r=4 กริดเส้นบาง
const BAR_MAX = 24
const axisTick = { fill: 'var(--muted)', fontSize: 12 }
const PLOT_HEIGHT = 220

type ChartProps = {
  days: Day[]
  selected: string
  onSelect: (date: string) => void
}

type CardProps = { title: string; subtitle?: string; icon: LucideIcon; children: ReactNode; legend?: Series[] }

export function ChartCard({ title, subtitle, icon, children, legend }: CardProps) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-2.5">
        <IconChip icon={icon} tone="neutral" />
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {legend && <Legend series={legend} />}
      <div className="mt-4 -ml-2">{children}</div>
    </section>
  )
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

type TipRow = { label: string; value: string; color: string }

// tooltip: ค่าเด่นกว่าชื่อ ใช้เส้นสั้นสีของ series เป็นตัวบอก
function Tip({ date, rows, note }: { date: string; rows: TipRow[]; note?: string }) {
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-sm shadow-xl backdrop-blur">
      <div className="mb-1.5 text-xs font-medium text-muted">{thaiDate(date)}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} />
          <span className="font-semibold">{r.value}</span>
          <span className="text-ink-2">{r.label}</span>
        </div>
      ))}
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  )
}

type TipContent = { active?: boolean; label?: string | number }

const xAxis = (n: number) => (
  <XAxis
    dataKey="date"
    tickFormatter={thaiShort}
    tick={axisTick}
    tickLine={false}
    axisLine={{ stroke: 'var(--axis)' }}
    interval="preserveStartEnd"
    minTickGap={n > 14 ? 24 : 8}
  />
)

const grid = <CartesianGrid vertical={false} stroke="var(--grid)" />

// ---------- กราฟแท่ง (หนึ่งหรือหลาย series ซ้อนกัน) ----------

type BarsProps = ChartProps & {
  series: Series[]
  format: (v: number) => string
  tick?: (v: number) => string
  tickStep?: number // ระยะห่างของ tick แกน y เช่น 120 นาที ให้ได้ค่ากลมเมื่อแสดงเป็นชั่วโมง
  missingNote?: string
}

export function Bars({ days, selected, onSelect, series, format, tick = compact, tickStep, missingNote = 'ไม่มีข้อมูล' }: BarsProps) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const data = days.map((d) => ({ date: d.date, ...Object.fromEntries(series.map((s) => [s.key, d.values[s.key]])) }))
  const top = series.length - 1
  let ticks: number[] | undefined
  if (tickStep) {
    const max = Math.max(tickStep, ...days.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0)))
    ticks = Array.from({ length: Math.ceil(max / tickStep) + 1 }, (_, i) => i * tickStep)
  }
  return (
    <div style={{ height: PLOT_HEIGHT }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
          {grid}
          {xAxis(days.length)}
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={tick}
            ticks={ticks}
            domain={ticks ? [0, ticks[ticks.length - 1]] : undefined}
          />
          <Tooltip
            cursor={{ fill: 'var(--wash)' }}
            content={({ active, label }: TipContent) => {
              const d = active && label ? byDate.get(String(label)) : undefined
              if (!d) return null
              const rows = series
                .filter((s) => d.values[s.key] != null)
                .map((s) => ({ label: s.label, value: format(d.values[s.key]!), color: s.color }))
              return <Tip date={d.date} rows={rows} note={rows.length === 0 ? missingNote : 'คลิกเพื่อดูวันนี้'} />
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={series.length > 1 ? 'stack' : undefined}
              fill={s.color}
              maxBarSize={BAR_MAX}
              radius={i === top ? [4, 4, 0, 0] : 0}
              stroke="var(--surface)"
              strokeWidth={series.length > 1 ? 2 : 0}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(item: { payload?: { date?: string } }) => item.payload?.date && onSelect(item.payload.date)}
            >
              {data.map((d) => (
                <Cell key={d.date} fillOpacity={d.date === selected ? 1 : 0.5} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- กราฟเส้นหนึ่ง series พื้นไล่สีจางใต้เส้น (ไม่ใช้สองแกน ตัวชี้วัดต่างหน่วยแยกกราฟ) ----------

type LineProps = ChartProps & { metric: string; label: string; format: (v: number) => string; color?: string }

export function TrendLine({ days, selected, onSelect, metric, label, format, color = 'var(--series-1)' }: LineProps) {
  const data = days.map((d) => ({ date: d.date, v: d.values[metric] }))
  const values = data.map((d) => d.v).filter((v): v is number => v != null)
  let ticks: number[] | undefined
  if (values.length) {
    const step = niceStep((Math.max(...values) - Math.min(...values)) / 4)
    const lo = Math.floor(Math.min(...values) / step) * step - step
    const hi = Math.ceil(Math.max(...values) / step) * step + step
    ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  }
  return (
    <div style={{ height: PLOT_HEIGHT }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onClick={(e: { activeLabel?: string | number }) => e?.activeLabel && onSelect(String(e.activeLabel))}
        >
          {grid}
          {xAxis(days.length)}
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={ticks ? [ticks[0], ticks[ticks.length - 1]] : ['auto', 'auto']}
            ticks={ticks}
            tickFormatter={(v: number) => num(v)}
          />
          <ReferenceLine x={selected} stroke="var(--axis)" />
          <Tooltip
            cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
            content={({ active, label: date }: TipContent) => {
              if (!active || !date) return null
              const v = data.find((d) => d.date === date)?.v
              return (
                <Tip
                  date={String(date)}
                  rows={v != null ? [{ label, value: format(v), color }] : []}
                  note={v == null ? 'ไม่มีข้อมูล' : 'คลิกเพื่อดูวันนี้'}
                />
              )
            }}
          />
          <defs>
            <linearGradient id={`wash-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            fill={`url(#wash-${metric})`}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={days.length <= 31 ? { r: 3, fill: color, stroke: 'var(--surface)', strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
            cursor="pointer"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// niceStep ปัดระยะห่างของ tick เป็น 1, 2, 5 × 10^n
function niceStep(raw: number): number {
  if (!(raw > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}
