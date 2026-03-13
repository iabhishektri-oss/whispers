import './styles/global.css'
import { getSupabase } from './lib/supabase'
import { navigate } from './lib/router'
import { setState, getState } from './lib/state'
import { initStory } from './screens/story'
import { initOnboarding } from './screens/onboarding'
import { initKeeper } from './screens/keeper'
import { initGiver } from './screens/giver'
import { initContributors } from './screens/contributors'
import { initChildMode } from './screens/child-mode'

async function boot(): Promise<void> {
  const sb = getSupabase()

  // Check for giver token FIRST
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  if (token) {
    setState({ isGiverMode: true })
    initGiver()
    await loadGiverData(token)
    return
  }

  // Initialize all screens
  initStory()
  initOnboarding()
  initKeeper()
  initContributors()
  initChildMode()

  // Check auth
  const { data } = await sb.auth.getSession()
  if (data.session) {
    setState({ authUserId: data.session.user.id, email: data.session.user.email || '' })
    console.log('Authenticated:', data.session.user.email)

    // Check for pending onboarding
    const pending = localStorage.getItem('whispers_onboarding')
    if (pending) {
      const saved = JSON.parse(pending)
      setState(saved)
      await saveOnboardingData()
      await saveFirstWhisper()
      localStorage.removeItem('whispers_onboarding')
      navigate('v-s7')
    } else {
      await loadChildData()
      if (getState().childId) {
        navigate('v-keeper')
      } else {
        navigate('v-story')
      }
    }
  } else {
    navigate('v-story')
  }

  // Listen for auth changes (magic link callback)
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      setState({ authUserId: session.user.id, email: session.user.email || '' })

      const pending = localStorage.getItem('whispers_onboarding')
      if (pending) {
        const saved = JSON.parse(pending)
        setState(saved)
        await saveOnboardingData()
        await saveFirstWhisper()
        localStorage.removeItem('whispers_onboarding')
        navigate('v-s7')
      } else {
        await loadChildData()
        if (getState().childId) navigate('v-keeper')
      }
    }
  })
}

async function loadChildData(): Promise<void> {
  const sb = getSupabase()
  const { authUserId } = getState()
  if (!authUserId) return

  const { data: profile } = await sb.from('profiles').select('name').eq('id', authUserId).maybeSingle()
  if (profile) setState({ keeper: profile.name || '' })

  const { data: child } = await sb.from('children').select('*').eq('keeper_id', authUserId).maybeSingle()
  if (child) {
    setState({
      childId: child.id,
      name: child.name,
      dob: child.dob || '',
      pronoun: child.pronoun || 'they',
    })
    console.log('Child loaded:', child.name, 'ID:', child.id)
  }
}

async function saveOnboardingData(): Promise<void> {
  const sb = getSupabase()
  const s = getState()
  if (!s.authUserId) return

  // Upsert profile
  await sb.from('profiles').upsert({
    id: s.authUserId,
    email: s.email,
    name: s.keeper,
  })

  // Insert child
  const { data: child, error } = await sb.from('children').insert({
    keeper_id: s.authUserId,
    name: s.name,
    dob: s.dob || null,
    pronoun: s.pronoun,
  }).select().single()

  if (error) {
    console.error('saveOnboardingData failed:', error)
    return
  }

  if (child) setState({ childId: child.id })
}

async function saveFirstWhisper(): Promise<void> {
  const raw = localStorage.getItem('whispers_first_whisper')
  if (!raw || !getState().childId) return

  try {
    const { saveWhisper } = await import('./lib/whispers')
    const fw = JSON.parse(raw)
    if (fw.format === 'write' && fw.content) {
      await saveWhisper({ format: 'write', content: fw.content })
      console.log('First whisper saved')
    }
    localStorage.removeItem('whispers_first_whisper')
  } catch (e) {
    console.error('Could not save first whisper:', e)
  }
}

async function loadGiverData(token: string): Promise<void> {
  try {
    const response = await fetch(
      'https://kxrpvmpoehmwcsszwpzt.supabase.co/functions/v1/resolve-invite',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnB2bXBvZWhtd2Nzc3p3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU5MTEsImV4cCI6MjA4ODc4MTkxMX0.BEnkm2XSyRUiLPWpKPu5AuTW-JFmYB1NQvXHubD2hVI',
        },
        body: JSON.stringify({ token })
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('Giver token invalid:', err.error || response.status)
      setState({ isGiverMode: false })
      initStory()
      initOnboarding()
      initKeeper()
      initContributors()
      initChildMode()
      navigate('v-story')
      return
    }

    const data = await response.json()

    setState({
      name: data.childName,
      childId: data.childId,
      dob: data.childDob || '',
      keeper: data.keeperName,
      giverContributorId: data.contributorId,
      giverNickname: data.contributorNickname,
      giverRelationship: data.contributorRelationship || '',
    })

    navigate('v-giver')
  } catch (e) {
    console.error('Giver load failed:', e)
    setState({ isGiverMode: false })
    initStory()
    initOnboarding()
    initKeeper()
    initContributors()
    initChildMode()
    navigate('v-story')
  }
}

// Boot
boot().catch(console.error)
