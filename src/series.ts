// series ของกราฟ: สีตามลำดับ slot ของ categorical palette ห้ามสลับลำดับ (ผ่านการตรวจ CVD เป็นคู่ติดกัน)
export type Series = { key: string; label: string; color: string }

export const sleepStages: Series[] = [
  { key: 'deep_min', label: 'หลับลึก', color: 'var(--series-1)' },
  { key: 'light_min', label: 'หลับตื้น', color: 'var(--series-2)' },
  { key: 'rem_min', label: 'REM', color: 'var(--series-3)' },
  { key: 'awake_min', label: 'ตื่นระหว่างคืน', color: 'var(--series-4)' },
]
