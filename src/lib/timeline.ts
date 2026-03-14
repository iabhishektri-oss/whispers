import { escHtml } from './utils'

export interface TimelineWhisper {
  id: string
  format: string
  content: string | null
  audio_url: string | null
  photo_url: string | null
  sealed: boolean
  seal_type: string | null
  seal_value: string | null
  created_at: string
  contributor_id: string | null
  contributors?: { nickname: string; relationship: string | null } | null
}

/** Calculate a child's age at a given date, using their DOB. */
function ageAt(dob: Date, at: Date): number {
  let age = at.getFullYear() - dob.getFullYear()
  const m = at.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--
  return Math.max(0, age)
}

/** Format a date for the date marker. */
function formatDateMarker(d: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  const days = Math.round(diff / 86400000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const label = `${d.getDate()} ${monthNames[d.getMonth()]}`
  return d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`
}

/** Date key for grouping: YYYY-MM-DD */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Render a path-style timeline for whispers.
 *
 * @param whispers - sorted newest-first
 * @param childDob - the child's date of birth string (YYYY-MM-DD)
 * @param renderCard - function that returns the inner card HTML for a whisper
 * @returns full timeline HTML string
 */
export function renderTimeline(
  whispers: TimelineWhisper[],
  childDob: string,
  renderCard: (w: TimelineWhisper) => string,
): string {
  if (!whispers.length) return ''

  const dob = new Date(childDob)
  const hasDob = !isNaN(dob.getTime())
  let prevAge: number | null = null
  let prevDateKey: string | null = null
  let html = ''

  for (const w of whispers) {
    const createdAt = new Date(w.created_at)
    const age = hasDob ? ageAt(dob, createdAt) : null
    const dk = dateKey(createdAt)

    // Age marker — when the child's age changes between consecutive whispers
    if (hasDob && age !== null && age !== prevAge) {
      const startYear = dob.getFullYear() + age
      const endYear = startYear + 1
      const ageLabel = age === 0 ? 'Newborn' : `Age ${age}`
      html += `
        <div style="position:relative;padding:20px 0 12px">
          <div style="position:absolute;left:-33px;top:22px;width:11px;height:11px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px rgba(200,144,12,0.3)"></div>
          <span style="font-family:var(--font-display);font-style:italic;font-size:1rem;color:var(--gold-hi)">${ageLabel}</span>
          <span style="font-size:0.65rem;color:var(--dim);margin-left:0.5rem">${startYear}\u2013${endYear}</span>
        </div>
      `
      prevAge = age
      // Reset date key so the first whisper under a new age always gets a date marker
      prevDateKey = null
    }

    // Date marker — when the date changes between consecutive whispers
    if (dk !== prevDateKey) {
      const label = formatDateMarker(createdAt)
      html += `
        <div style="position:relative;padding:14px 0 6px">
          <div style="position:absolute;left:-30px;top:17px;width:6px;height:6px;border-radius:50%;background:rgba(200,144,12,0.35)"></div>
          <span style="font-size:0.65rem;color:var(--dim)">${escHtml(label)}</span>
        </div>
      `
      prevDateKey = dk
    }

    // Whisper card with branch connector
    html += `
      <div style="position:relative;padding:4px 0">
        <div style="position:absolute;left:-30px;top:50%;width:5px;height:5px;border-radius:50%;background:rgba(200,144,12,0.35);transform:translateY(-50%)"></div>
        <div style="position:absolute;left:-25px;top:50%;width:25px;height:1.5px;background:rgba(200,144,12,0.12);transform:translateY(-50%)"></div>
        ${renderCard(w)}
      </div>
    `
  }

  // Wrap in timeline container with vertical line
  return `
    <div style="position:relative;padding-left:48px">
      <div style="position:absolute;left:20px;top:0;bottom:0;width:1.5px;background:linear-gradient(to bottom, rgba(200,144,12,0.12) 90%, transparent 100%)"></div>
      ${html}
    </div>
  `
}
