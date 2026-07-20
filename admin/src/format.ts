/** ISO 时间 → 本地「yyyy-MM-dd HH:mm」 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max)}…` : text
}
