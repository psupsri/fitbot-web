// วันที่จาก API เป็น YYYY-MM-DD ตามวันของผู้ใช้ แปลงเป็นเวลาเที่ยงวัน UTC เพื่อไม่ให้ timezone ของเบราว์เซอร์เลื่อนวัน
const toDate = (d: string) => new Date(`${d}T12:00:00Z`)

const longFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const numFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })

export const thaiDate = (d: string) => longFmt.format(toDate(d))
export const thaiShort = (d: string) => shortFmt.format(toDate(d))
export const num = (v: number) => numFmt.format(v)

export function addDays(d: string, n: number): string {
  const t = toDate(d)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

// duration แสดงนาทีเป็น "7 ชม. 5 นาที" เหมือนรายงาน LINE
export function duration(min: number): string {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  if (h === 0) return `${m} นาที`
  return m % 60 === 0 ? `${h} ชม.` : `${h} ชม. ${m % 60} นาที`
}

// ค่าแกน y ของกราฟเวลา: ปัดเป็นชั่วโมง
export const hoursTick = (min: number) => `${Math.round(min / 60)} ชม.`

export function compact(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : String(v)
}

// ส่วนของค่าที่แสดงในช่องตัวเลขหลัก: ตัวเลขใหญ่ หน่วยเล็ก เช่น 6 ชม. 52 นาที
export type Part = { n: string; u: string }

export function durationParts(min: number): Part[] {
  const m = Math.round(min)
  const h = Math.floor(m / 60)
  if (h === 0) return [{ n: String(m), u: 'นาที' }]
  return m % 60 === 0 ? [{ n: String(h), u: 'ชม.' }] : [{ n: String(h), u: 'ชม.' }, { n: String(m % 60), u: 'นาที' }]
}
