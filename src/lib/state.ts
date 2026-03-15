export interface AppState {
  // Child data
  name: string
  dob: string
  pronoun: string
  photo: string | null

  // Keeper data
  keeper: string
  relationship: string
  email: string

  // IDs from database
  childId: string | null
  authUserId: string | null

  // Trial & plan
  trialStart: string | null
  plan: string | null

  // Onboarding flags
  hasFirstWhisper: boolean

  // Giver mode
  isGiverMode: boolean
  giverContributorId: string | null
  giverNickname: string
  giverRelationship: string
}

const state: AppState = {
  name: '',
  dob: '',
  pronoun: 'they',
  photo: null,
  keeper: '',
  relationship: '',
  email: '',
  childId: null,
  authUserId: null,
  trialStart: null,
  plan: null,
  hasFirstWhisper: false,
  isGiverMode: false,
  giverContributorId: null,
  giverNickname: '',
  giverRelationship: '',
}

type Listener = () => void
const listeners: Listener[] = []

export function getState(): Readonly<AppState> {
  return state
}

export function setState(partial: Partial<AppState>): void {
  Object.assign(state, partial)
  listeners.forEach(fn => fn())
}

export function onStateChange(fn: Listener): void {
  listeners.push(fn)
}

// Helper: get the child's display name or fallback
export function childName(): string {
  return state.name || 'your child'
}

// Helper: get keeper display name or fallback
export function keeperName(): string {
  return state.keeper || 'Their family'
}
