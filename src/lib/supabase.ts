import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kxrpvmpoehmwcsszwpzt.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: {
        // Force every fetch to bypass browser HTTP cache AND add a timeout.
        // Without cache:'no-store', mobile Safari returns stale cached responses.
        // Without the timeout, iOS Safari can hang indefinitely on stale TCP
        // connections after returning from background — the auth token refresh
        // and subsequent queries all block on dead sockets that never close.
        fetch: (url, options = {}) => {
          const urlStr = typeof url === 'string' ? url : url.toString()
          const isStorage = urlStr.includes('/storage/')
          const timeoutMs = isStorage ? 120_000 : 15_000

          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), timeoutMs)

          // If the caller already provided a signal, forward its abort
          const originalSignal = options.signal as AbortSignal | undefined
          if (originalSignal) {
            if (originalSignal.aborted) controller.abort()
            else originalSignal.addEventListener('abort', () => controller.abort(), { once: true })
          }

          return fetch(url, { ...options, signal: controller.signal, cache: 'no-store' as RequestCache })
            .finally(() => clearTimeout(timer))
        },
      },
    })
  }
  return client
}

/**
 * Force-refresh the Supabase session. Call this when the app returns from
 * background to unblock any queries waiting on a stale token refresh.
 */
export async function ensureFreshSession(): Promise<void> {
  const sb = getSupabase()
  try {
    const { error } = await sb.auth.getSession()
    if (error) console.warn('[Supabase] session refresh error:', error.message)
  } catch (e) {
    console.warn('[Supabase] session refresh failed:', e)
  }
}
