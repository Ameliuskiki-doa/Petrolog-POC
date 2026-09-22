/** Demo "today" — the prototype is staged in March 2028, after the Stage 1B cut-over. */
export const TODAY = new Date('2028-03-10T09:00:00+07:00')
export const TODAY_ISO = '2028-03-10'

/** Full rupiah, e.g. IDR 1,250,000 */
export function idr(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}IDR ${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

/** Compact rupiah, e.g. IDR 1.25 bn / IDR 340.5 m */
export function idrShort(n: number): string {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1e12) return `${sign}IDR ${(a / 1e12).toFixed(2)} tn`
  if (a >= 1e9) return `${sign}IDR ${(a / 1e9).toFixed(2)} bn`
  if (a >= 1e6) return `${sign}IDR ${(a / 1e6).toFixed(1)} m`
  if (a >= 1e3) return `${sign}IDR ${(a / 1e3).toFixed(0)} k`
  return `${sign}IDR ${a.toFixed(0)}`
}

/** Plain number with thousands separator */
export function num(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2028-03-10' -> '10 Mar 2028' */
export function date(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** '2028-03-10T14:05' -> '10 Mar 2028, 14:05' */
export function dateTime(iso: string): string {
  const d = new Date(iso)
  return `${date(iso.slice(0, 10))}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Whole days from iso date until TODAY (negative = in the past) */
export function daysUntil(iso: string): number {
  const d = new Date(iso + 'T00:00:00+07:00')
  return Math.round((d.getTime() - new Date(TODAY_ISO + 'T00:00:00+07:00').getTime()) / 86400000)
}

/** Whole days elapsed since iso date */
export function ageDays(iso: string): number {
  return -daysUntil(iso.slice(0, 10))
}

export function period(p: string): string {
  // '2028-02' -> 'Feb 2028'
  const [y, m] = p.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}
