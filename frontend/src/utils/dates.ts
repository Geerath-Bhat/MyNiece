/**
 * Parse a datetime string from the backend.
 * SQLite returns naive datetimes (no timezone suffix). Without 'Z',
 * browsers treat the string as LOCAL time — causing a 5.5h offset in IST.
 * This helper appends 'Z' so the value is always interpreted as UTC.
 */
export function parseUTC(ts: string | null | undefined): Date {
  if (!ts) return new Date()
  // Already has timezone info → parse as-is
  if (ts.endsWith('Z') || ts.includes('+') || /T\d{2}:\d{2}:\d{2}-\d/.test(ts)) {
    return new Date(ts)
  }
  // No timezone → assume UTC (backend always stores UTC)
  return new Date(ts + 'Z')
}

/** Format a UTC datetime string as a local time string (HH:MM) */
export function fmtTime(ts: string | Date): string {
  const d = typeof ts === 'string' ? parseUTC(ts) : ts
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Format a UTC datetime string as local date + time */
export function fmtDateTime(ts: string | Date): string {
  const d = typeof ts === 'string' ? parseUTC(ts) : ts
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Return an ISO 8601 string (UTC) for a local datetime-local input value.
 * e.g. "2024-01-15T09:30" → "2024-01-15T04:00:00.000Z" (for IST +5:30)
 */
export function localInputToUTC(localString: string): string {
  return new Date(localString).toISOString()
}

/** Current local datetime in the format required by <input type="datetime-local"> */
export function nowForInput(): string {
  const d = new Date()
  // Shift to local timezone for the input
  const offset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}
