import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kxrpvmpoehmwcsszwpzt.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI'

let client: SupabaseClient | null = null

const FETCH_TIMEOUT = 15_000

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: {
        fetch: (url, options = {}) => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
          // Merge our signal; if caller already has one, respect it too
          const signal = options.signal
            ? anySignal([options.signal, controller.signal])
            : controller.signal
          return fetch(url, { ...options, cache: 'no-store', signal })
            .finally(() => clearTimeout(timeout))
        },
      },
    })
  }
  return client
}

/** Combine multiple AbortSignals — aborts when ANY signal fires */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); return controller.signal }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true })
  }
  return controller.signal
}
