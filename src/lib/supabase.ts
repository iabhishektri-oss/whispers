import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kxrpvmpoehmwcsszwpzt.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI'

const FETCH_TIMEOUT = 15_000
let consecutiveFailures = 0

let client: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: {
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
        const signal = options.signal
          ? anySignal([options.signal, controller.signal])
          : controller.signal
        return fetch(url, { ...options, cache: 'no-store', signal })
          .finally(() => clearTimeout(timeout))
      },
    },
  })
}

export function getSupabase(): SupabaseClient {
  if (!client) client = buildClient()
  return client
}

/**
 * Call after a successful Supabase query to reset the failure counter.
 */
export function markSuccess(): void {
  consecutiveFailures = 0
}

/**
 * Call after a failed/timed-out Supabase query.
 * After 2 consecutive failures, destroy and recreate the client
 * to escape GoTrueClient's stuck "refreshing" state.
 */
export function markFailure(): void {
  consecutiveFailures++
  if (consecutiveFailures >= 2) {
    console.warn('[Supabase] 2 consecutive failures — recreating client')
    client = buildClient()
    consecutiveFailures = 0
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); return controller.signal }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true })
  }
  return controller.signal
}
