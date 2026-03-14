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
      <div id="cs-seal-wrap" style="margin:1rem 0">
        <!-- State 1: Collapsed prompt -->
        <div id="cs-seal-prompt" style="display:flex;align-items:center;gap:0.6rem;padding:14px 16px;border:1px solid var(--input-bd);border-radius:14px;cursor:pointer;transition:all var(--duration)">
          ${iconLock(16, 'var(--dim)')} <span style="font-size:var(--text-body-sm);color:var(--dim)">Seal this whisper?</span>
        </div>
        <!-- State 2: Expanded picker -->
        <div id="cs-seal-expand" style="max-height:0;overflow:hidden;transition:max-height 0.25s ease;border:1px solid transparent;border-radius:14px">
          <div style="padding:14px 16px">
            <div style="font-size:var(--text-body-sm);color:var(--body);margin-bottom:0.75rem">${escHtml(childName())} will open this at:</div>
            <div id="cs-seal-pills" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.6rem">
              <button class="cs-pill" data-age="10">10</button>
              <button class="cs-pill" data-age="13">13</button>
              <button class="cs-pill" data-age="16">16</button>
              <button class="cs-pill cs-pill-on" data-age="18">18</button>
              <button class="cs-pill" data-age="21">21</button>
              <button class="cs-pill" data-age="custom">Custom</button>
            </div>
            <div id="cs-seal-stepper" style="display:none;align-items:center;justify-content:center;gap:1rem;margin-bottom:0.6rem">
              <button id="cs-seal-minus" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--input-bd);background:none;color:var(--body);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">&minus;</button>
              <span id="cs-seal-custom-val" style="font-size:1rem;font-weight:600;color:var(--gold-hi);min-width:2ch;text-align:center">18</span>
              <button id="cs-seal-plus" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--input-bd);background:none;color:var(--body);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
            </div>
            <div style="font-size:var(--text-meta);color:var(--dim)">Until then, only you can see it.</div>
          </div>
        </div>
        <!-- State 3: Confirmed -->
        <div id="cs-seal-confirmed" style="display:none;align-items:center;gap:0.6rem;padding:14px 16px;border:1px solid rgba(200,144,12,0.3);border-radius:14px;background:rgba(200,144,12,0.06)">
          ${iconLock(16, 'var(--gold-hi)')} <span id="cs-seal-label" style="flex:1;font-size:var(--text-body-sm);color:var(--gold-hi)"></span>
          <button id="cs-seal-remove" style="width:24px;height:24px;border:none;background:none;color:var(--dim);cursor:pointer;font-size:0.9rem;padding:0">&times;</button>
        </div>
      </div>
      <button id="cs-save" class="btn gold off">Save whisper</button>
      <div id="cs-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
    `

    const tabs = sheetContent.querySelectorAll('.format-tab')
    const body = sheetContent.querySelector('#cs-body') as HTMLDivElement
    const saveBtn = sheetContent.querySelector('#cs-save') as HTMLButtonElement
    const statusEl = sheetContent.querySelector('#cs-status') as HTMLDivElement
    // Seal interaction: three states
    let sealAge = 18
    const sealPrompt = sheetContent.querySelector('#cs-seal-prompt') as HTMLDivElement
    const sealExpand = sheetContent.querySelector('#cs-seal-expand') as HTMLDivElement
    const sealConfirmed = sheetContent.querySelector('#cs-seal-confirmed') as HTMLDivElement
    const sealLabel = sheetContent.querySelector('#cs-seal-label') as HTMLSpanElement
    const sealStepper = sheetContent.querySelector('#cs-seal-stepper') as HTMLDivElement
    const sealCustomVal = sheetContent.querySelector('#cs-seal-custom-val') as HTMLSpanElement
    const sealPills = sheetContent.querySelectorAll('.cs-pill')

    // Pill inline styles (injected once)
    const pillBase = 'padding:8px 18px;border-radius:100px;border:1px solid var(--input-bd);background:none;font-family:var(--font-body);font-size:var(--text-body-sm);color:var(--body);cursor:pointer;transition:all var(--duration);'
    const pillOn = 'padding:8px 18px;border-radius:100px;border:1px solid rgba(200,144,12,0.4);background:rgba(200,144,12,0.15);font-family:var(--font-body);font-size:var(--text-body-sm);color:var(--gold-hi);cursor:pointer;transition:all var(--duration);'
    sealPills.forEach(p => {
      const el = p as HTMLElement
      el.style.cssText = el.classList.contains('cs-pill-on') ? pillOn : pillBase
    })

    function setSealState(state: 'collapsed' | 'expanded' | 'confirmed'): void {
      sealPrompt.style.display = state === 'collapsed' ? 'flex' : 'none'
      sealExpand.style.maxHeight = state === 'expanded' ? '220px' : '0'
      sealExpand.style.borderColor = state === 'expanded' ? 'var(--input-bd)' : 'transparent'
      sealConfirmed.style.display = state === 'confirmed' ? 'flex' : 'none'
      sealEnabled = state === 'confirmed'
      saveBtn.textContent = sealEnabled ? 'Seal and save' : 'Save whisper'
    }

    function selectPill(age: string): void {
      sealPills.forEach(p => {
        const el = p as HTMLElement
        const isOn = el.dataset.age === age
        el.style.cssText = isOn ? pillOn : pillBase
        el.classList.toggle('cs-pill-on', isOn)
      })
      if (age === 'custom') {
        sealStepper.style.display = 'flex'
      } else {
        sealStepper.style.display = 'none'
        sealAge = parseInt(age)
      }
    }

    // State 1 → State 2
    sealPrompt.addEventListener('click', () => {
      setSealState('expanded')
    })

    // Pill clicks → confirm
    sealPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const age = (pill as HTMLElement).dataset.age || '18'
        selectPill(age)
        if (age !== 'custom') {
          sealAge = parseInt(age)
          sealLabel.textContent = `Sealed until ${escHtml(childName())} is ${sealAge}`
          setSealState('confirmed')
        }
      })
    })

    // Custom stepper
    sheetContent.querySelector('#cs-seal-minus')!.addEventListener('click', () => {
      if (sealAge > 10) {
        sealAge--
        sealCustomVal.textContent = String(sealAge)
      }
    })
    sheetContent.querySelector('#cs-seal-plus')!.addEventListener('click', () => {
      if (sealAge < 25) {
        sealAge++
        sealCustomVal.textContent = String(sealAge)
      }
    })

    // Custom confirm: tap outside stepper or re-tap custom pill when stepper is showing
    // We add a small confirm button logic: selecting custom + changing value, then tapping any pill confirms
    // For simplicity, add a done action: tapping the custom pill again confirms
    const customPill = sheetContent.querySelector('[data-age="custom"]') as HTMLButtonElement
    customPill.addEventListener('click', () => {
      if (sealStepper.style.display === 'flex') {
        // Second tap on custom = confirm
        sealLabel.textContent = `Sealed until ${escHtml(childName())} is ${sealAge}`
        setSealState('confirmed')
      }
    })

    // State 3 → State 1 (remove seal)
    sheetContent.querySelector('#cs-seal-remove')!.addEventListener('click', () => {
      setSealState('collapsed')
      sealAge = 18
      sealCustomVal.textContent = '18'
      selectPill('18') // reset pills
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

      const sealVal = sealEnabled ? String(sealAge) : null

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
          await loadFeed()
        } else {
          statusEl.style.display = 'block'
          statusEl.style.color = '#e85454'
          statusEl.textContent = result.error || 'Could not save. Try again.'
          saveBtn.textContent = sealEnabled ? 'Seal and save' : 'Save whisper'
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
