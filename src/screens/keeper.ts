import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { getSupabase } from '@/lib/supabase'
import { saveWhisper } from '@/lib/whispers'
import { startRecording, stopRecording, getRecordingBlob, clearRecording, isRecording } from '@/lib/recorder'
import { iconHome, iconFamily, iconPlus, iconMic, iconWrite, iconCamera, iconCheck, iconSeal, iconLock } from '@/lib/icons'
import { escHtml, timeAgo, formatDuration } from '@/lib/utils'

interface WhisperRow {
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

let feedLoaded = false
let recordTimer: ReturnType<typeof setInterval> | null = null
let recordSeconds = 0

export function initKeeper(): void {
  const app = document.getElementById('app')!

  const view = document.createElement('div')
  view.id = 'v-keeper'
  view.className = 'view'
  view.innerHTML = `
    <div class="shell" style="padding-top:1.25rem;padding-bottom:6rem">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <div>
          <span class="wordmark">Whispers</span>
          <div style="font-size:var(--text-meta);color:var(--dim);margin-top:0.15rem" id="k-subtitle"></div>
        </div>
        <button id="k-child-toggle" class="pill" style="gap:0.4rem">
          ${iconLock(14)} Child mode
        </button>
      </div>

      <!-- Feed -->
      <div id="k-feed" style="display:flex;flex-direction:column;gap:0.75rem">
        <div style="text-align:center;padding:3rem 0;color:var(--dim);font-size:var(--text-body)">
          <div class="spinner" style="margin:0 auto 1rem"></div>
          Loading whispers...
        </div>
      </div>
    </div>

    <!-- Bottom nav -->
    <div class="bottom-nav">
      <div class="nav-item active" id="k-nav-home">${iconHome(22)}</div>
      <div class="nav-item-center" id="k-nav-compose">${iconPlus(24, 'var(--gold-hi)')}</div>
      <div class="nav-item" id="k-nav-family">${iconFamily(22)}</div>
    </div>

    <!-- Compose sheet overlay -->
    <div class="sheet-overlay" id="k-sheet-overlay">
      <div class="sheet" id="k-sheet">
        <div class="sheet-handle"></div>
        <div id="k-sheet-content"></div>
      </div>
    </div>
  `
  app.appendChild(view)

  // Nav
  view.querySelector('#k-nav-home')!.addEventListener('click', () => {
    navigate('v-keeper')
  })
  view.querySelector('#k-nav-family')!.addEventListener('click', () => {
    navigate('v-contributors')
  })
  view.querySelector('#k-child-toggle')!.addEventListener('click', () => {
    navigate('v-child-mode')
  })

  // Compose sheet
  const overlay = view.querySelector('#k-sheet-overlay') as HTMLDivElement
  const sheetContent = view.querySelector('#k-sheet-content') as HTMLDivElement

  view.querySelector('#k-nav-compose')!.addEventListener('click', () => {
    openComposeSheet()
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet()
  })

  function openComposeSheet(): void {
    let activeFormat: 'write' | 'voice' | 'photo' = 'write'
    let sealEnabled = false

    sheetContent.innerHTML = `
      <div class="headline-sm" style="text-align:center;margin-bottom:1rem">New whisper for ${escHtml(childName())}</div>
      <div class="format-tabs" id="cs-tabs">
        <div class="format-tab active" data-fmt="write">${iconWrite(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Write</span></div>
        <div class="format-tab" data-fmt="voice">${iconMic(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Voice</span></div>
        <div class="format-tab" data-fmt="photo">${iconCamera(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Photo</span></div>
      </div>
      <div id="cs-body"></div>
      <div style="display:flex;align-items:center;gap:0.75rem;margin:1rem 0">
        <button class="pill" id="cs-seal">${iconSeal(12)} Seal until age...</button>
        <input id="cs-seal-age" class="input" type="number" min="1" max="30" placeholder="18" style="width:60px;text-align:center;display:none;padding:0.5rem" />
      </div>
      <button id="cs-save" class="btn gold off">Save whisper</button>
      <div id="cs-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
    `

    const tabs = sheetContent.querySelectorAll('.format-tab')
    const body = sheetContent.querySelector('#cs-body') as HTMLDivElement
    const saveBtn = sheetContent.querySelector('#cs-save') as HTMLButtonElement
    const statusEl = sheetContent.querySelector('#cs-status') as HTMLDivElement
    const sealBtn = sheetContent.querySelector('#cs-seal') as HTMLButtonElement
    const sealAge = sheetContent.querySelector('#cs-seal-age') as HTMLInputElement

    sealBtn.addEventListener('click', () => {
      sealEnabled = !sealEnabled
      sealBtn.classList.toggle('active', sealEnabled)
      sealAge.style.display = sealEnabled ? '' : 'none'
    })

    function renderBody(): void {
      clearRecording()
      if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
      recordSeconds = 0

      if (activeFormat === 'write') {
        body.innerHTML = `
          <textarea id="cs-text" class="textarea" placeholder="Write something for ${escHtml(childName())}..." maxlength="1000"></textarea>
          <div style="text-align:right;font-size:var(--text-meta);color:var(--dim);margin-top:0.25rem"><span id="cs-wcount">0</span>/1000</div>
        `
        const ta = body.querySelector('#cs-text') as HTMLTextAreaElement
        ta.addEventListener('input', () => {
          (body.querySelector('#cs-wcount') as HTMLSpanElement).textContent = String(ta.value.length)
          saveBtn.classList.toggle('off', ta.value.trim().length === 0)
        })
        saveBtn.classList.add('off')
      } else if (activeFormat === 'voice') {
        body.innerHTML = `
          <div style="text-align:center;padding:1rem 0">
            <div id="cs-rec-status" style="font-size:var(--text-body);color:var(--dim);margin-bottom:1rem">Tap to start recording</div>
            <div id="cs-rec-time" style="font-size:var(--text-display-xl);font-family:var(--font-display);font-style:italic;color:var(--white);margin-bottom:1rem">0:00</div>
            <button id="cs-rec-btn" class="btn" style="width:auto;padding:0.75rem 2rem;margin:0 auto">${iconMic(18)} Record</button>
            <div id="cs-rec-preview" style="display:none;margin-top:1rem">
              <audio id="cs-rec-audio" controls style="width:100%;margin-bottom:0.5rem"></audio>
              <button id="cs-rec-redo" class="btn" style="width:auto;padding:0.5rem 1.5rem;margin:0 auto;font-size:var(--text-meta)">Record again</button>
            </div>
          </div>
        `
        const recBtn = body.querySelector('#cs-rec-btn') as HTMLButtonElement
        const recStatus = body.querySelector('#cs-rec-status') as HTMLDivElement
        const recTime = body.querySelector('#cs-rec-time') as HTMLDivElement
        const recPreview = body.querySelector('#cs-rec-preview') as HTMLDivElement
        const recAudio = body.querySelector('#cs-rec-audio') as HTMLAudioElement
        saveBtn.classList.add('off')

        recBtn.addEventListener('click', async () => {
          if (isRecording()) {
            stopRecording()
            recBtn.innerHTML = `${iconMic(18)} Record`
            recStatus.textContent = 'Recording saved'
            if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
            // Wait a tick for blob
            setTimeout(() => {
              const blob = getRecordingBlob()
              if (blob) {
                recAudio.src = URL.createObjectURL(blob)
                recPreview.style.display = ''
                recBtn.style.display = 'none'
                saveBtn.classList.remove('off')
              }
            }, 200)
          } else {
            const ok = await startRecording()
            if (!ok) {
              recStatus.textContent = 'Microphone access denied'
              recStatus.style.color = '#e85454'
              return
            }
            recBtn.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#e85454;animation:blink 1s infinite"></div> Stop`
            recStatus.textContent = 'Recording...'
            recStatus.style.color = 'var(--gold-hi)'
            recordSeconds = 0
            recordTimer = setInterval(() => {
              recordSeconds++
              recTime.textContent = formatDuration(recordSeconds)
              if (recordSeconds >= 180) {
                recBtn.click() // Auto-stop at 3 minutes
              }
            }, 1000)
          }
        })

        body.querySelector('#cs-rec-redo')?.addEventListener('click', () => {
          clearRecording()
          recPreview.style.display = 'none'
          recBtn.style.display = ''
          recBtn.innerHTML = `${iconMic(18)} Record`
          recStatus.textContent = 'Tap to start recording'
          recStatus.style.color = 'var(--dim)'
          recTime.textContent = '0:00'
          saveBtn.classList.add('off')
        })
      } else {
        // Photo
        body.innerHTML = `
          <div style="text-align:center">
            <div id="cs-photo-preview" style="width:100%;max-height:300px;border-radius:var(--radius-card);overflow:hidden;margin-bottom:1rem;display:none"></div>
            <input id="cs-photo-file" type="file" accept="image/*" style="display:none" />
            <button id="cs-photo-choose" class="btn">${iconCamera(16)} Choose photo</button>
            <textarea id="cs-photo-caption" class="textarea" placeholder="Add a caption (optional)" maxlength="1000" style="margin-top:1rem;min-height:60px;display:none"></textarea>
          </div>
        `
        const pFile = body.querySelector('#cs-photo-file') as HTMLInputElement
        const pPreview = body.querySelector('#cs-photo-preview') as HTMLDivElement
        const pChoose = body.querySelector('#cs-photo-choose') as HTMLButtonElement
        const pCaption = body.querySelector('#cs-photo-caption') as HTMLTextAreaElement
        saveBtn.classList.add('off')

        pChoose.addEventListener('click', () => pFile.click())
        pFile.addEventListener('change', () => {
          const file = pFile.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            pPreview.innerHTML = `<img src="${reader.result}" style="width:100%;display:block" />`
            pPreview.style.display = ''
            pCaption.style.display = ''
            pChoose.textContent = 'Change photo'
            saveBtn.classList.remove('off')
          }
          reader.readAsDataURL(file)
        })
      }
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        activeFormat = (tab as HTMLElement).dataset.fmt as 'write' | 'voice' | 'photo'
        renderBody()
      })
    })

    saveBtn.addEventListener('click', async () => {
      if (saveBtn.classList.contains('off')) return
      saveBtn.innerHTML = '<div class="spinner"></div>'
      saveBtn.classList.add('off')
      statusEl.style.display = 'none'

      const sealVal = sealEnabled ? sealAge.value || '18' : null

      try {
        let result
        if (activeFormat === 'write') {
          const text = (sheetContent.querySelector('#cs-text') as HTMLTextAreaElement)?.value.trim()
          result = await saveWhisper({
            format: 'write',
            content: text,
            sealed: sealEnabled,
            sealType: sealEnabled ? 'age' : null,
            sealValue: sealVal,
          })
        } else if (activeFormat === 'voice') {
          const blob = getRecordingBlob()
          result = await saveWhisper({
            format: 'voice',
            audioBlob: blob,
            sealed: sealEnabled,
            sealType: sealEnabled ? 'age' : null,
            sealValue: sealVal,
          })
        } else {
          const file = (sheetContent.querySelector('#cs-photo-file') as HTMLInputElement)?.files?.[0]
          const caption = (sheetContent.querySelector('#cs-photo-caption') as HTMLTextAreaElement)?.value.trim()
          result = await saveWhisper({
            format: 'photo',
            photoFile: file,
            content: caption || null,
            sealed: sealEnabled,
            sealType: sealEnabled ? 'age' : null,
            sealValue: sealVal,
          })
        }

        if (result.success) {
          closeSheet()
          clearRecording()
          loadFeed()
        } else {
          statusEl.style.display = 'block'
          statusEl.style.color = '#e85454'
          statusEl.textContent = result.error || 'Could not save. Try again.'
          saveBtn.innerHTML = 'Save whisper'
          saveBtn.classList.remove('off')
        }
      } catch (e) {
        console.error('[Keeper] Save failed:', e)
        statusEl.style.display = 'block'
        statusEl.style.color = '#e85454'
        statusEl.textContent = 'Something went wrong. Please try again.'
        saveBtn.innerHTML = 'Save whisper'
        saveBtn.classList.remove('off')
      }
    })

    renderBody()
    overlay.classList.add('open')
  }

  function closeSheet(): void {
    overlay.classList.remove('open')
    if (isRecording()) stopRecording()
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    clearRecording()
  }

  // Feed loading
  async function loadFeed(): Promise<void> {
    const { childId } = getState()
    if (!childId) return

    const feed = view.querySelector('#k-feed') as HTMLDivElement
    const sb = getSupabase()

    let data, error
    try {
      const res = await sb
        .from('whispers')
        .select('*, contributors(nickname, relationship)')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(50)
      data = res.data
      error = res.error
    } catch (e) {
      console.error('Feed exception:', e)
      feed.innerHTML = `<div style="text-align:center;padding:2rem 0;color:#e85454;font-size:var(--text-body)">Could not load whispers.</div>`
      return
    }

    if (error) {
      feed.innerHTML = `<div style="text-align:center;padding:2rem 0;color:#e85454;font-size:var(--text-body)">Could not load whispers.</div>`
      console.error('Feed error:', error)
      return
    }

    const whispers = (data || []) as WhisperRow[]
    if (whispers.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center;padding:3rem 0">
          <div class="headline-sm" style="margin-bottom:0.5rem">No whispers yet</div>
          <p style="color:var(--dim);font-size:var(--text-body)">Tap the + button to leave the first whisper for ${escHtml(childName())}.</p>
        </div>
      `
      return
    }

    feed.innerHTML = whispers.map(w => renderWhisperCard(w)).join('')

    // Wire audio play buttons
    feed.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = (btn as HTMLElement).dataset.play!
        const audio = new Audio(url)
        audio.play().catch(() => {})
        btn.innerHTML = `<div style="width:6px;height:6px;border-radius:50%;background:var(--gold);animation:blink 1.5s infinite"></div> Playing...`
        audio.addEventListener('ended', () => {
          btn.innerHTML = `${iconMic(14)} Play`
        })
      })
    })

    feedLoaded = true
  }

  function renderWhisperCard(w: WhisperRow): string {
    const from = w.contributors?.nickname || keeperName()
    const rel = w.contributors?.relationship || getState().relationship || ''
    const initials = from[0]?.toUpperCase() || '?'
    const ago = timeAgo(w.created_at)

    let body = ''
    if (w.sealed) {
      body = `
        <div style="display:flex;align-items:center;gap:0.5rem;color:var(--gold);font-size:var(--text-body);padding:1rem 0">
          ${iconLock(16, 'var(--gold)')}
          <span>Sealed until ${w.seal_type === 'age' ? `age ${escHtml(w.seal_value || '18')}` : 'later'}</span>
        </div>
      `
    } else if (w.format === 'write') {
      body = `<p style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body);white-space:pre-wrap">${escHtml(w.content || '')}</p>`
    } else if (w.format === 'voice') {
      body = `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0">
          <button class="pill active" data-play="${escHtml(w.audio_url || '')}" style="cursor:pointer">${iconMic(14)} Play</button>
        </div>
      `
    } else if (w.format === 'photo') {
      body = `
        ${w.photo_url ? `<img src="${escHtml(w.photo_url)}" style="width:100%;border-radius:var(--radius-card);margin-bottom:0.5rem" />` : ''}
        ${w.content ? `<p style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body)">${escHtml(w.content)}</p>` : ''}
      `
    }

    return `
      <div class="card" style="animation:rise 0.4s both">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem">
          <div class="avatar">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-body);font-weight:500;color:var(--white)">${escHtml(from)}</div>
            <div style="font-size:var(--text-meta);color:var(--dim)">${escHtml(rel)}${rel ? ' . ' : ''}${ago}</div>
          </div>
          <span class="label">${w.format}</span>
        </div>
        ${body}
        ${w.sealed ? `<div class="seal-badge">${iconSeal()} Sealed</div>` : ''}
      </div>
    `
  }

  // Route change listener
  onRouteChange((_from, to) => {
    if (to === 'v-keeper') {
      const sub = view.querySelector('#k-subtitle')
      if (sub) sub.textContent = `${childName()}'s collection`
      loadFeed()
    }
  })
}
