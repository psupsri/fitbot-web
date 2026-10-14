// ชนิดข้อมูลตรงกับ fitbot-api/internal/httpapi (null = ไม่มีข้อมูล ห้ามแสดงเป็น 0)

export type User = { id: number; name: string; timezone: string }

export type Window = { days: number; with_data: number; avg: number | null; text: string }

export type Metric = {
  key: string
  label: string
  group: 'sleep' | 'activity'
  value: number | null
  text: string
  windows: Window[]
  trend: { direction: 'up' | 'down' | 'stable' | ''; pct_change: number | null }
}

export type Alert = { rule_id: string; metric: string; label: string; value: string; criterion: string; reference: string }

export type Coaching = { summary: string; advice: string[]; watch_explanation: string }

export type Report = {
  state: 'sync_notice_sent' | 'report_sent' | 'partial_report_sent'
  sent_at: string | null
  llm_used: boolean | null
  coaching: Coaching | null
  content: string | null
}

export type Sleep = {
  bedtime: string | null
  wake_time: string | null
  asleep_min: number | null
  deep_min: number | null
  light_min: number | null
  rem_min: number | null
  awake_min: number | null
  nap_min: number | null
}

export type Day = {
  date: string
  values: Record<string, number | null>
  bedtime: string | null
  wake_time: string | null
}

export type Dashboard = {
  user: User
  date: string
  first_date: string | null
  last_date: string | null
  status: { activity: string; sleep: string } | null
  sleep: Sleep | null
  metrics: Metric[]
  weekly: { azm: number | null; moderate_equivalent: number | null; days: number }
  alerts: { watch: Alert[]; improve: Alert[] }
  report: Report | null
  series: Day[]
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const fetchUsers = (signal?: AbortSignal) => get<User[]>('/api/users', signal)

export const fetchDashboard = (userId: number, date: string | null, days: number, signal?: AbortSignal) => {
  const q = new URLSearchParams({ days: String(days) })
  if (date) q.set('date', date)
  return get<Dashboard>(`/api/users/${userId}/dashboard?${q}`, signal)
}

// ผลของ Orchestrator: full_report | partial_report = ส่งแล้ว, sync_notice | wait = ข้อมูลยังไม่ครบ, skip = เคยส่งแล้ว
export type SendResult = {
  user_id: number
  date: string
  action?: 'skip' | 'full_report' | 'partial_report' | 'sync_notice' | 'wait'
  detail?: string
  retry_at?: string
}

export async function sendReport(userId: number, date: string, partial: boolean): Promise<SendResult> {
  const res = await fetch(`/api/users/${userId}/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, partial }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
  return body
}
