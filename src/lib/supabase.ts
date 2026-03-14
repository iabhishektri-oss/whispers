import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kxrpvmpoehmwcsszwpzt.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: {
        // Force every fetch to bypass browser HTTP cache.
        // Without this, mobile Safari returns stale cached responses
        // on pull-to-refresh, hiding newly added whispers.
        fetch: (url, options = {}) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    })
  }
  return client
}
