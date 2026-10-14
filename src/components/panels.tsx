import {
  Armchair,
  BedDouble,
  CheckCircle2,
  Footprints,
  HeartPulse,
  Info,
  Loader2,
  Moon,
  Send,
  Sparkles,
  Stethoscope,
  Sunrise,
  Target,
  TriangleAlert,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { sendReport, type Alert, type Dashboard, type Day, type Metric, type Report, type SendResult, type Sleep } from '../api'
import { duration, durationParts, num, thaiDate, type Part } from '../format'
import { sleepStages } from '../series'

// ข้อความตายตัวเดียวกับรายงาน LINE (FR15, RK10)
const DISCLAIMER =
  'ข้อมูลนี้เป็นคำแนะนำจาก AI และระบบอัตโนมัติ ไม่ใช่คำวินิจฉัยของแพทย์ และ Fitbot ไม่ใช่ระบบแจ้งเหตุฉุกเฉิน ถ้ามีอาการผิดปกติหรือไม่แน่ใจ ควรปรึกษาแพทย์'

// ---------- ส่วนประกอบร่วม ----------

export function IconChip({ icon: Icon, tone = 'accent' }: { icon: LucideIcon; tone?: 'accent' | 'neutral' }) {
  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${tone === 'accent' ? 'bg-accent-soft text-s1' : 'bg-wash text-ink-2'}`}
      aria-hidden
    >
      <Icon className="size-4" strokeWidth={2.2} />
    </span>
  )
}

function CardTitle({ icon, children, right }: { icon: LucideIcon; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 font-semibold tracking-tight">
        <IconChip icon={icon} />
        {children}
      </h2>
      {right}
    </div>
  )
}

function Value({ parts, size = 'lg' }: { parts: Part[]; size?: 'lg' | 'xl' }) {
  const n = size === 'xl' ? 'text-4xl' : 'text-[26px] leading-8'
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-baseline gap-0.5">
          <span className={`${n} font-semibold tracking-tight`}>{p.n}</span>
          <span className="text-sm font-medium text-ink-2">{p.u}</span>
        </span>
      ))}
    </span>
  )
}

// ---------- บทวิเคราะห์จาก AI (ส่วนหลักของหน้า) ----------

type CoachProps = { report: Report | null; userId: number; date: string; onSent: () => void }

export function CoachCard({ report, userId, date, onSent }: CoachProps) {
  const c = report?.coaching
  return (
    <section className="card relative overflow-hidden p-5 sm:p-6">
      {/* แสงจางๆ มุมการ์ด เน้นว่าเป็นส่วนหลัก */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent-soft blur-3xl" aria-hidden />
      <div className="relative">
        <CardTitle icon={Sparkles} right={<ReportBadge report={report} />}>
          บทวิเคราะห์
        </CardTitle>
        {c ? (
          <div className="mt-4 space-y-5">
            <p className="text-[17px] leading-relaxed">{c.summary}</p>
            {c.advice.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">คำแนะนำวันนี้</h3>
                <ol className="space-y-2">
                  {c.advice.map((a, i) => (
                    <li key={a} className="flex gap-3 rounded-xl bg-wash px-3.5 py-3 leading-relaxed">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink-2 shadow-card">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-ink-2">{emptyCoachText(report)}</p>
        )}
        <SendReport key={`${userId}|${date}`} report={report} userId={userId} date={date} onSent={onSent} />
        {report?.content && report.state !== 'sync_notice_sent' && (
          <details className="group mt-4 text-sm">
            <summary className="cursor-pointer list-none text-ink-2 hover:text-ink">
              <span className="inline-block transition-transform group-open:rotate-90">›</span> ดูข้อความที่ส่งทาง LINE
            </summary>
            <pre className="mt-2 rounded-xl bg-wash p-4 font-sans leading-relaxed whitespace-pre-wrap">{report.content}</pre>
          </details>
        )}
      </div>
    </section>
  )
}

function emptyCoachText(r: Report | null): string {
  if (!r) return 'ยังไม่มีรายงานของวันนี้ รายงานจะถูกสร้างเมื่อระบบรันตามรอบและข้อมูลครบ'
  if (r.state === 'sync_notice_sent') return 'ยังไม่มีรายงาน ระบบส่งข้อความให้ sync ไปแล้ว และจะส่งรายงานในรอบถัดไป'
  if (r.llm_used === false) return 'รายงานวันนี้เป็นแบบตัวเลขอย่างเดียว เพราะเรียก AI ไม่สำเร็จ'
  return 'รายงานวันนี้ส่งก่อนที่ระบบจะเก็บบทวิเคราะห์แยกส่วน ดูฉบับเต็มได้จากข้อความที่ส่งทาง LINE ด้านล่าง'
}

function ReportBadge({ report }: { report: Report | null }) {
  const [label, dot] = !report
    ? ['ยังไม่มีรายงาน', 'bg-muted']
    : report.state === 'report_sent'
      ? ['ส่งทาง LINE แล้ว', 'bg-good']
      : report.state === 'partial_report_sent'
        ? ['ส่งรายงานบางส่วนแล้ว', 'bg-good']
        : ['รอ sync ข้อมูล', 'bg-warning']
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ---------- ปุ่มส่งรายงาน: ทำงานแบบเดียวกับรอบอัตโนมัติ (ดึงข้อมูลล่าสุด ตรวจความครบ ไม่ส่งซ้ำ) ----------

type SendState =
  | { kind: 'idle' }
  | { kind: 'sending'; partial: boolean }
  | { kind: 'done'; result: SendResult }
  | { kind: 'error'; message: string }

const todayLocal = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function SendReport({ report, userId, date, onSent }: CoachProps) {
  const [state, setState] = useState<SendState>({ kind: 'idle' })
  const sent = report?.state === 'report_sent' || report?.state === 'partial_report_sent'

  const send = async (partial: boolean) => {
    setState({ kind: 'sending', partial })
    try {
      const result = await sendReport(userId, date, partial)
      setState({ kind: 'done', result })
      onSent() // โหลด dashboard ใหม่ให้เห็นบทวิเคราะห์และสถานะล่าสุด
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  if (sent && state.kind !== 'done') {
    const at = report?.sent_at ? new Date(report.sent_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null
    return (
      <p className="mt-5 flex items-center gap-1.5 text-sm text-muted">
        <CheckCircle2 className="size-4" /> ส่งรายงานของวันนี้ทาง LINE แล้ว{at ? ` เมื่อ ${at} น.` : ''} · ส่งได้วันละ 1 ฉบับ
      </p>
    )
  }
  if (date >= todayLocal()) {
    return <p className="mt-5 text-sm text-muted">รายงานของวันนี้ส่งได้หลังจบวัน</p>
  }

  const busy = state.kind === 'sending'
  const result = state.kind === 'done' ? state.result : null
  const incomplete = result?.action === 'sync_notice' || result?.action === 'wait'
  return (
    <div className="mt-5 border-t border-line pt-5">
      {(!result || incomplete) && (
        <div className="flex flex-wrap items-center gap-2">
          {incomplete ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-card transition hover:bg-wash disabled:opacity-60"
              disabled={busy}
              onClick={() => send(true)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              ส่งรายงานบางส่วนเลย
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-s1 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
              disabled={busy}
              onClick={() => send(false)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {busy ? 'กำลังส่ง…' : 'ส่งรายงานทาง LINE ตอนนี้'}
            </button>
          )}
        </div>
      )}
      <SendMessage state={state} />
    </div>
  )
}

function SendMessage({ state }: { state: SendState }) {
  switch (state.kind) {
    case 'idle':
      return <p className="mt-2.5 text-xs text-muted">ดึงข้อมูลล่าสุดจาก Google Health แล้วส่งรายงานตามกฎเดียวกับรอบอัตโนมัติ ถ้าข้อมูลยังไม่ครบจะถามก่อน</p>
    case 'sending':
      return (
        <p className="mt-2.5 text-sm text-ink-2" role="status">
          กำลังดึงข้อมูลล่าสุดและให้ AI เขียนบทวิเคราะห์ อาจใช้เวลาราว 1 นาที
        </p>
      )
    case 'error':
      return (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm text-critical-text" role="alert">
          <TriangleAlert className="size-4" /> ส่งไม่สำเร็จ: {state.message}
        </p>
      )
    case 'done': {
      const r = state.result
      if (r.action === 'full_report' || r.action === 'partial_report') {
        return (
          <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-good-text" role="status">
            <CheckCircle2 className="size-4" /> {r.action === 'partial_report' ? 'ส่งรายงานบางส่วน' : 'ส่งรายงาน'}ทาง LINE แล้ว
          </p>
        )
      }
      if (r.action === 'skip') return <p className="mt-2.5 text-sm text-ink-2">รายงานของวันนี้ถูกส่งไปแล้ว ระบบไม่ส่งซ้ำ</p>
      return (
        <div className="mt-3 rounded-xl bg-wash p-3.5 text-sm text-ink-2" role="status">
          <p className="flex items-start gap-1.5 font-medium text-ink">
            <Info className="mt-0.5 size-4 shrink-0" /> {r.detail}
          </p>
          <p className="mt-1">
            {r.action === 'sync_notice' && 'ส่งข้อความให้เปิดแอปเพื่อ sync ไปทาง LINE แล้ว '}
            {r.retry_at && `ระบบจะส่งรายงานบางส่วนเองหลัง ${r.retry_at.slice(11)} น. `}
            ถ้าไม่อยากรอ กด "ส่งรายงานบางส่วนเลย" ได้ (ฉบับเดียวต่อวัน ส่งแล้วจะส่งฉบับเต็มทีหลังไม่ได้)
          </p>
        </div>
      )
    }
  }
}

// ---------- ค่าที่ควรเฝ้าระวังและสิ่งที่ควรปรับปรุง (ตัดสินด้วยกฎ ไม่ใช่ AI) ----------

export function AlertsCard({ watch, improve, explanation }: { watch: Alert[]; improve: Alert[]; explanation?: string }) {
  if (watch.length === 0 && improve.length === 0) return null
  return (
    <section className="card p-5 sm:p-6">
      {watch.length > 0 && (
        <div>
          <CardTitle icon={Stethoscope}>ค่าที่ควรเฝ้าระวัง</CardTitle>
          <AlertList alerts={watch} kind="watch" />
          {explanation && <p className="mt-3 leading-relaxed">{explanation}</p>}
          <p className="mt-3 flex gap-1.5 text-xs text-muted">
            <Info className="mt-px size-3.5 shrink-0" /> {DISCLAIMER}
          </p>
        </div>
      )}
      {improve.length > 0 && (
        <div className={watch.length > 0 ? 'mt-5 border-t border-line pt-5' : ''}>
          <CardTitle icon={Target}>สิ่งที่ควรปรับปรุง</CardTitle>
          <AlertList alerts={improve} kind="improve" />
        </div>
      )}
    </section>
  )
}

function AlertList({ alerts, kind }: { alerts: Alert[]; kind: 'watch' | 'improve' }) {
  return (
    <ul className="mt-3 space-y-2">
      {alerts.map((a) => (
        <li key={a.rule_id} className="flex gap-3 rounded-xl bg-wash px-3.5 py-3">
          {/* สีสถานะมาพร้อมไอคอนและป้ายเสมอ ไม่ใช้สีอย่างเดียว */}
          {kind === 'watch' ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical" aria-label="ควรเฝ้าระวัง" />
          ) : (
            <Target className="mt-0.5 size-4 shrink-0 text-warning" aria-label="ควรปรับปรุง" />
          )}
          <div>
            <div>
              <span className="font-medium">{a.label}</span> <span className="text-ink-2">{a.value}</span>
            </div>
            <div className="mt-0.5 text-sm text-ink-2">เกณฑ์: {a.criterion}</div>
            {kind === 'watch' && <div className="text-xs text-muted">อ้างอิง: {a.reference}</div>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------- ตัวเลขหลัก: ค่า วัน D, เทียบเฉลี่ย 7 วัน, sparkline ----------

type TileDef = { key: string; label: string; icon: LucideIcon; upIsGood: boolean; parts: (v: number) => Part[] }

const tiles: TileDef[] = [
  { key: 'asleep_min', label: 'เวลานอนหลับ', icon: Moon, upIsGood: true, parts: durationParts },
  { key: 'hrv_ms', label: 'HRV', icon: Waves, upIsGood: true, parts: (v) => [{ n: v.toFixed(0), u: 'ms' }] },
  { key: 'resting_hr', label: 'ชีพจรขณะพัก', icon: HeartPulse, upIsGood: false, parts: (v) => [{ n: v.toFixed(0), u: 'bpm' }] },
  { key: 'steps', label: 'ก้าวเดิน', icon: Footprints, upIsGood: true, parts: (v) => [{ n: num(v), u: 'ก้าว' }] },
  { key: 'active_zone_min', label: 'ออกกำลัง AZM', icon: Zap, upIsGood: true, parts: (v) => [{ n: num(v), u: 'นาที' }] },
  { key: 'sedentary_min', label: 'เวลานั่งนิ่ง', icon: Armchair, upIsGood: false, parts: durationParts },
]

export function StatTiles({ metrics, days, onSelect }: { metrics: Metric[]; days: Day[]; onSelect: (d: string) => void }) {
  const byKey = new Map(metrics.map((m) => [m.key, m]))
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => {
        const m = byKey.get(t.key)
        return m ? <Tile key={t.key} t={t} m={m} days={days} onSelect={onSelect} /> : null
      })}
    </div>
  )
}

function Tile({ t, m, days, onSelect }: { t: TileDef; m: Metric; days: Day[]; onSelect: (d: string) => void }) {
  const avg7 = m.windows.find((w) => w.days === 7)
  let delta: { text: string; cls: string } | null = null
  if (m.value != null && avg7?.avg) {
    const pct = ((m.value - avg7.avg) / avg7.avg) * 100
    const flat = Math.abs(pct) < 1
    const cls = flat ? 'bg-wash text-ink-2' : pct > 0 === t.upIsGood ? 'bg-good/12 text-good-text' : 'bg-critical/12 text-critical-text'
    delta = { text: flat ? 'เท่าค่าเฉลี่ย' : `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(0)}%`, cls }
  }
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-center gap-2">
        <IconChip icon={t.icon} tone="neutral" />
        <span className="truncate text-sm font-medium text-ink-2" title={t.label}>
          {t.label}
        </span>
      </div>
      <div className="mt-3 min-h-8">{m.value != null ? <Value parts={t.parts(m.value)} /> : <span className="text-lg font-medium text-muted">ไม่มีข้อมูล</span>}</div>
      <Sparkline days={days.slice(-14)} metric={t.key} onSelect={onSelect} />
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-xs">
        {delta && <span className={`rounded-full px-2 py-0.5 font-semibold ${delta.cls}`}>{delta.text}</span>}
        <span className="text-muted">{avg7?.avg != null ? `เฉลี่ย 7 วัน ${avg7.text}` : 'ยังไม่มีค่าเฉลี่ย'}</span>
      </div>
    </div>
  )
}

// sparkline: เส้นสีจาง จุดท้ายคือวันที่เลือกเป็นสีหลัก ช่วงที่ไม่มีข้อมูลเว้นว่าง
function Sparkline({ days, metric, onSelect }: { days: Day[]; metric: string; onSelect: (d: string) => void }) {
  const W = 120
  const H = 28
  const vals = days.map((d) => d.values[metric])
  const nums = vals.filter((v): v is number => v != null)
  if (nums.length < 2) return <div className="mt-2 h-7" />
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  const x = (i: number) => (days.length === 1 ? W : (i / (days.length - 1)) * (W - 6) + 3)
  const y = (v: number) => (hi === lo ? H / 2 : H - 3 - ((v - lo) / (hi - lo)) * (H - 6))
  const segs: string[] = []
  let cur = ''
  vals.forEach((v, i) => {
    if (v == null) {
      if (cur) segs.push(cur)
      cur = ''
    } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
  })
  if (cur) segs.push(cur)
  const last = vals.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-7 w-full" preserveAspectRatio="none" aria-hidden>
      {segs.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--axis)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
      {vals[last] != null && (
        <circle cx={x(last)} cy={y(vals[last]!)} r={3} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      )}
      {days.map((d, i) => (
        <rect key={d.date} x={x(i) - W / days.length / 2} y={0} width={W / days.length} height={H} fill="transparent" className="cursor-pointer" onClick={() => onSelect(d.date)}>
          <title>{thaiDate(d.date)}</title>
        </rect>
      ))}
    </svg>
  )
}

// ---------- การนอนเมื่อคืน: แถบสัดส่วนช่วงการนอน ----------

export function SleepCard({ sleep, date }: { sleep: Sleep | null; date: string }) {
  return (
    <section className="card p-5 sm:p-6">
      <CardTitle icon={Moon}>การนอนเมื่อคืน</CardTitle>
      <p className="mt-1 ml-10.5 text-sm text-muted">คืน{thaiDate(date)}</p>
      {!sleep ? (
        <p className="mt-4 text-ink-2">ยังไม่มีข้อมูลการนอนหลักของคืนนี้ (การนอนคืนวัน D จะมาหลังตื่นและ sync ในวันถัดไป)</p>
      ) : (
        <SleepBody sleep={sleep} />
      )}
    </section>
  )
}

function SleepBody({ sleep }: { sleep: Sleep }) {
  const stages = sleepStages.map((s) => ({ ...s, min: sleep[s.key as keyof Sleep] as number | null }))
  const total = stages.reduce((sum, s) => sum + (s.min ?? 0), 0)
  return (
    <>
      <div className="mt-4">{sleep.asleep_min != null ? <Value parts={durationParts(sleep.asleep_min)} size="xl" /> : <span className="text-muted">ไม่มีข้อมูล</span>}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1">
          <BedDouble className="size-3.5 text-ink-2" /> เข้านอน <b className="font-semibold">{sleep.bedtime ?? '–'}</b>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1">
          <Sunrise className="size-3.5 text-ink-2" /> ตื่น <b className="font-semibold">{sleep.wake_time ?? '–'}</b>
        </span>
        {sleep.nap_min != null && <span className="inline-flex items-center rounded-full bg-wash px-3 py-1">งีบ {duration(sleep.nap_min)}</span>}
      </div>
      {total > 0 && (
        <>
          <div className="mt-5 flex h-2.5 gap-0.75" role="img" aria-label="สัดส่วนช่วงการนอน">
            {stages.filter((s) => s.min).map((s) => (
              <div key={s.key} className="rounded-full" style={{ width: `${(s.min! / total) * 100}%`, background: s.color }} title={`${s.label} ${duration(s.min!)}`} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {stages.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold">{s.min != null ? duration(s.min) : '–'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

// ---------- ออกกำลังกาย 7 วันเทียบเป้าหมาย WHO 150–300 นาที (วงแหวน) ----------

export function WeeklyCard({ weekly }: { weekly: Dashboard['weekly'] }) {
  const v = weekly.moderate_equivalent
  const reached = v != null && v >= 150
  return (
    <section className="card p-5 sm:p-6">
      <CardTitle icon={Target}>ออกกำลังกาย 7 วัน</CardTitle>
      {v == null ? (
        <p className="mt-4 text-ink-2">ยังไม่มีข้อมูล Active Zone Minutes ใน 7 วันล่าสุด</p>
      ) : (
        <div className="mt-4 flex items-center gap-5">
          <Ring value={v} />
          <div className="min-w-0">
            <p className="text-sm text-ink-2">เป้าหมาย WHO 150–300 นาที/สัปดาห์</p>
            <p className={`mt-1 flex items-center gap-1.5 font-semibold ${reached ? 'text-good-text' : ''}`}>
              {reached ? (
                <>
                  <CheckCircle2 className="size-4" /> ถึงเป้าหมายขั้นต่ำแล้ว
                </>
              ) : (
                `อีก ${num(150 - v)} นาทีจะถึงเป้า`
              )}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              นับแบบ WHO ที่นาทีออกกำลังหนักนับเป็น 2 เท่า (ในแอป {num(weekly.azm ?? 0)} นาที) · มีข้อมูล {weekly.days} จาก 7 วัน
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

// วงแหวน 0–300 นาที มีขีดที่ 150 (เป้าขั้นต่ำ) แทร็กเป็นสีเดียวกันแต่จางกว่า
function Ring({ value }: { value: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const frac = Math.min(value / 300, 1)
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--series-1)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`} />
        {/* ขีด 150 นาที = ครึ่งวง แสดงที่ 6 นาฬิกา (svg หมุน -90° จุดด้านซ้ายของ svg จึงอยู่ล่าง) */}
        <line x1={50 - r - 6} y1="50" x2={50 - r + 6} y2="50" stroke="var(--ink-2)" strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight">{num(value)}</span>
        <span className="text-[11px] text-muted">/ 300 นาที</span>
      </div>
    </div>
  )
}

// ---------- ตาราง: ทุกค่าในกราฟอ่านได้โดยไม่ต้อง hover ----------

const tableCols: { key: string; label: string; fmt: (v: number) => string }[] = [
  { key: 'asleep_min', label: 'หลับจริง', fmt: duration },
  { key: 'deep_min', label: 'หลับลึก', fmt: duration },
  { key: 'rem_min', label: 'REM', fmt: duration },
  { key: 'hrv_ms', label: 'HRV (ms)', fmt: (v) => v.toFixed(0) },
  { key: 'resting_hr', label: 'ชีพจรพัก', fmt: (v) => v.toFixed(0) },
  { key: 'steps', label: 'ก้าว', fmt: num },
  { key: 'active_zone_min', label: 'AZM', fmt: num },
  { key: 'sedentary_min', label: 'นั่งนิ่ง', fmt: duration },
]

export function DataTable({ days, selected, onSelect }: { days: Day[]; selected: string; onSelect: (d: string) => void }) {
  return (
    <section className="card overflow-x-auto p-2 sm:p-3">
      <table className="w-full min-w-180 text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs tracking-wide text-muted uppercase">
            <th className="px-3 py-2.5 font-medium">วันที่</th>
            <th className="px-3 py-2.5 font-medium">เข้านอน–ตื่น</th>
            {tableCols.map((c) => (
              <th key={c.key} className="px-3 py-2.5 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((d) => (
            <tr
              key={d.date}
              onClick={() => onSelect(d.date)}
              className={`cursor-pointer border-t border-line transition-colors hover:bg-wash ${d.date === selected ? 'bg-accent-soft font-medium' : ''}`}
            >
              <td className="px-3 py-2 whitespace-nowrap">{thaiDate(d.date)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{d.bedtime ? `${d.bedtime}–${d.wake_time}` : '–'}</td>
              {tableCols.map((c) => (
                <td key={c.key} className="px-3 py-2 text-right whitespace-nowrap">
                  {d.values[c.key] != null ? c.fmt(d.values[c.key]!) : <span className="text-muted">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 pt-2 pb-1 text-xs text-muted">– = ไม่มีข้อมูล หรือวันที่สวมอุปกรณ์ไม่ถึงครึ่งวัน (ไม่นำมาคิดค่าเฉลี่ย)</p>
    </section>
  )
}
