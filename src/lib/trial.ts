const TRIAL_DAYS = 14
const NUDGE_DAYS_LEFT = 4

export interface TrialStatus {
  active: boolean
  daysLeft: number
  expired: boolean
  showNudge: boolean
  isPaid: boolean
}

export function getTrialStatus(trialStart: string | null, plan: string | null): TrialStatus {
  if (plan && plan !== 'free') {
    return { active: true, daysLeft: 0, expired: false, showNudge: false, isPaid: true }
  }

  if (!trialStart) {
    return { active: true, daysLeft: TRIAL_DAYS, expired: false, showNudge: false, isPaid: false }
  }

  const start = new Date(trialStart)
  const now = new Date()
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsed)
  const expired = daysLeft === 0
  const showNudge = !expired && daysLeft <= NUDGE_DAYS_LEFT

  return { active: !expired, daysLeft, expired, showNudge, isPaid: false }
}
