import { Activity, BarChart3, ChevronLeft, ChevronRight, Footprints, HeartPulse, Moon, Table2, Waves, Zap, Armchair } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { fetchDashboard, fetchUsers, type Dashboard, type User } from './api'
import { Bars, ChartCard, TrendLine } from './components/charts'
import { AlertsCard, CoachCard, DataTable, SleepCard, StatTiles, WeeklyCard } from './components/panels'
import { addDays, duration, hoursTick, num, thaiDate } from './format'
import { sleepStages } from './series'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

// วันที่และช่วงเวลาอยู่ใน URL เพื่อให้รีเฟรชหรือบุ๊กมาร์กแล้วได้หน้าเดิม
function readUrl(): { date: string | null; range: Range } {
  const q = new URLSearchParams(location.search)
  const r = Number(q.get('range'))
  return { date: q.get('date'), range: (RANGES as readonly number[]).includes(r) ? (r as Range) : 30 }
}

export default function App() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [date, setDate] = useState<string | null>(readUrl().date)
  const [range, setRange] = useState<Range>(readUrl().range)
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [reloads, setReloads] = useState(0) // เพิ่มเมื่อต้องโหลดใหม่ เช่น หลังสั่งส่งรายงาน
  // เก็บ key ของคำขอคู่กับข้อมูล ถ้าไม่ตรงกับตัวเลือกปัจจุบันแปลว่ากำลังโหลด
  const [loaded, setLoaded] = useState<{ key: string; data: Dashboard } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = `${userId}|${date}|${range}|${reloads}`
  const data = loaded?.data ?? null
  const loading = loaded?.key !== key && !error

  useEffect(() => {
    const ac = new AbortController()
    fetchUsers(ac.signal)
      .then((u) => {
        setUsers(u)
        setUserId(u[0]?.id ?? null)
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (userId == null) return
    const ac = new AbortController()
    const k = `${userId}|${date}|${range}|${reloads}`
    fetchDashboard(userId, date, range, ac.signal)
      .then((d) => {
        setLoaded({ key: k, data: d })
        setError(null)
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => ac.abort()
  }, [userId, date, range, reloads])

  useEffect(() => {
    const q = new URLSearchParams()
    if (date) q.set('date', date)
    q.set('range', String(range))
    history.replaceState(null, '', `?${q}`)
  }, [date, range])

  if (error && !data) return <Message title="เชื่อมต่อ API ไม่ได้" body={`${error} — ตรวจว่ารัน \`fitbot serve\` อยู่หรือไม่`} />
  if (users && users.length === 0) return <Message title="ยังไม่มีผู้ใช้" body="เพิ่มผู้ใช้ด้วย `fitbot user add` ก่อน" />
  if (!data) return <Message title="กำลังโหลด…" spinner />

  const d = data
  const select = (x: string) => setDate(x)
  const canPrev = !!d.first_date && d.date > d.first_date
  const canNext = !!d.last_date && d.date < d.last_date
  const chart = { days: d.series, selected: d.date, onSelect: select }

  return (
    <div className="min-h-screen">
      {/* แถบบนแบบกระจก: ตัวกรองแถวเดียวที่มีผลกับทั้งหน้า */}
      <header className="sticky top-0 z-20 border-b border-line bg-glass backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-s1 text-white shadow-card">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight">Fitbot</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-line bg-surface shadow-card">
              <IconButton label="วันก่อน" disabled={!canPrev} onClick={() => select(addDays(d.date, -1))}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <input
                type="date"
                className="bg-transparent px-1 py-1.5 text-sm font-medium tabular-nums outline-none"
                value={d.date}
                min={d.first_date ?? undefined}
                max={d.last_date ?? undefined}
                onChange={(e) => e.target.value && select(e.target.value)}
                aria-label="เลือกวันที่"
              />
              <IconButton label="วันถัดไป" disabled={!canNext} onClick={() => select(addDays(d.date, 1))}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
            <Segmented
              options={RANGES.map((r) => ({ value: r, label: `${r} วัน` }))}
              value={range}
              onChange={setRange}
              aria="ช่วงเวลาของกราฟ"
            />
            {users && users.length > 1 && (
              <select
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm shadow-card"
                value={userId ?? ''}
                onChange={(e) => {
                  setUserId(Number(e.target.value))
                  setDate(null)
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">สวัสดี {d.user.name} 👋</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-[34px]">{thaiDate(d.date)}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {d.last_date && d.date !== d.last_date && (
              <button className="rounded-full px-3 py-1.5 font-medium text-s1 hover:bg-accent-soft" onClick={() => select(d.last_date!)}>
                ไปวันล่าสุด →
              </button>
            )}
            {loading && <span className="text-muted">กำลังโหลด…</span>}
            {error && <span className="text-critical-text">โหลดไม่สำเร็จ: {error}</span>}
          </div>
        </div>

        {/* ระหว่างโหลดคงหน้าเดิมไว้แต่จางลง ไม่กระพริบ */}
        <main className={`mt-6 space-y-4 transition-opacity sm:space-y-5 ${loading ? 'opacity-60' : ''}`}>
          <StatTiles metrics={d.metrics} days={d.series} onSelect={select} />

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-5">
            <div className="space-y-4 sm:space-y-5 lg:col-span-3">
              <CoachCard report={d.report} userId={d.user.id} date={d.date} onSent={() => setReloads((n) => n + 1)} />
              <AlertsCard watch={d.alerts.watch} improve={d.alerts.improve} explanation={d.report?.coaching?.watch_explanation} />
            </div>
            <div className="space-y-4 sm:space-y-5 lg:col-span-2">
              <SleepCard sleep={d.sleep} date={d.date} />
              <WeeklyCard weekly={d.weekly} />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">แนวโน้ม {range} วัน</h2>
              <p className="mt-0.5 text-sm text-muted">คลิกแท่งหรือจุดในกราฟเพื่อดูวันนั้น</p>
            </div>
            <Segmented
              options={[
                { value: 'chart', label: 'กราฟ', icon: BarChart3 },
                { value: 'table', label: 'ตาราง', icon: Table2 },
              ]}
              value={view}
              onChange={setView}
              aria="รูปแบบการแสดงผล"
            />
          </div>

          {view === 'table' ? (
            <DataTable {...chart} />
          ) : (
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
              <ChartCard icon={Moon} title="การนอน" subtitle="เวลาในแต่ละช่วงการนอนหลักต่อคืน" legend={sleepStages}>
                <Bars {...chart} series={sleepStages} format={duration} tick={hoursTick} tickStep={120} missingNote="ไม่มีข้อมูลช่วงการนอน" />
              </ChartCard>
              <ChartCard icon={Footprints} title="ก้าวเดิน" subtitle="ก้าวต่อวัน (วันที่สวมไม่ถึงครึ่งวันไม่แสดง)">
                <Bars {...chart} series={[{ key: 'steps', label: 'ก้าว', color: 'var(--series-1)' }]} format={(v) => `${num(v)} ก้าว`} />
              </ChartCard>
              <ChartCard icon={Waves} title="HRV ขณะนอน" subtitle="ความแปรปรวนของจังหวะหัวใจ (ms) สูงกว่ามักแปลว่าพักฟื้นได้ดี">
                <TrendLine {...chart} metric="hrv_ms" label="HRV" format={(v) => `${v.toFixed(0)} ms`} />
              </ChartCard>
              <ChartCard icon={HeartPulse} title="ชีพจรขณะพัก" subtitle="ครั้งต่อนาที (bpm) ต่ำกว่ามักแปลว่าหัวใจแข็งแรง">
                <TrendLine {...chart} metric="resting_hr" label="ชีพจรขณะพัก" format={(v) => `${v.toFixed(0)} bpm`} />
              </ChartCard>
              <ChartCard icon={Zap} title="Active Zone Minutes" subtitle="นาทีที่หัวใจเต้นแรงพอจะนับเป็นการออกกำลังกาย">
                <Bars {...chart} series={[{ key: 'active_zone_min', label: 'AZM', color: 'var(--series-1)' }]} format={(v) => `${num(v)} นาที`} />
              </ChartCard>
              <ChartCard icon={Armchair} title="เวลานั่งนิ่ง" subtitle="ไม่รวมเวลานอน">
                <Bars
                  {...chart}
                  series={[{ key: 'sedentary_min', label: 'นั่งนิ่ง', color: 'var(--series-1)' }]}
                  format={duration}
                  tick={hoursTick}
                  tickStep={240}
                />
              </ChartCard>
            </div>
          )}
          <p className="pt-4 text-center text-xs text-muted">ตัวเลขทั้งหมดคำนวณด้วยกฎเดียวกับรายงาน LINE · ข้อมูลอยู่บนเครื่องนี้เท่านั้น</p>
        </main>
      </div>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="inline-flex size-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-wash hover:text-ink disabled:cursor-default disabled:text-muted/50 disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  aria,
}: {
  options: { value: T; label: string; icon?: typeof BarChart3 }[]
  value: T
  onChange: (v: T) => void
  aria: string
}) {
  return (
    <div className="flex rounded-full border border-line bg-surface p-0.5 shadow-card" role="group" aria-label={aria}>
      {options.map((o) => {
        const Icon = o.icon
        const on = o.value === value
        return (
          <button
            key={o.value}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${on ? 'bg-ink font-medium text-page' : 'text-ink-2 hover:text-ink'}`}
            onClick={() => onChange(o.value)}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Message({ title, body, spinner }: { title: string; body?: string; spinner?: boolean }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      {spinner && <Activity className="mx-auto mb-4 size-8 animate-pulse text-s1" />}
      <h1 className="text-xl font-semibold">{title}</h1>
      {body && <p className="mt-2 text-ink-2">{body}</p>}
    </div>
  )
}
