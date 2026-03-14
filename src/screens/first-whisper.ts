import { navigate } from '@/lib/router'
import { getState, setState } from '@/lib/state'
import { iconMic, iconWrite, iconCamera, iconBack } from '@/lib/icons'
import { startRecording, stopRecording, getRecordingBlob, clearRecording, isRecording } from '@/lib/recorder'
import { formatDuration } from '@/lib/utils'

let recordTimer: ReturnType<typeof setInterval> | null = null
let recordSeconds = 0

export function initFirstWhisper(): void {
  const app = document.getElementById('app')!

  const view = document.createElement('div')
  view.id = 'v-first-letter'
  view.className = 'view'
  view.innerHTML = `
    <div class="shell" style="padding-top:2rem;padding-bottom:2rem;min-height:100dvh;display:flex;flex-direction:column">
      <!-- Top bar -->
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.75rem">
        <button class="back" id="fl-back">${iconBack()}</button>
        <span style="font-size:var(--text-label);color:var(--dim);letter-spacing:0.12em;text-transform:uppercase;flex:1;text-align:center;margin-right:2.5rem">Your first whisper for them</span>
      </div>

      <!-- Headline -->
      <div style="text-align:center;margin-bottom:0.6rem">
        <span class="headline" style="font-size:var(--text-headline);line-height:var(--lh-headline)">Leave them <span style="color:var(--gold-hi)">your voice.</span></span>
      </div>
      <p style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body);text-align:center;margin-bottom:1.75rem">
        It doesn't have to be perfect.<br>Just your voice, saying something true.
      </p>

      <!-- Format tabs -->
      <div class="format-tabs" id="fl-tabs">
        <div class="format-tab active" data-fmt="voice">${iconMic(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Voice</span></div>
        <div class="format-tab" data-fmt="write">${iconWrite(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Write</span></div>
        <div class="format-tab" data-fmt="photo">${iconCamera(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Photo</span></div>
      </div>

      <!-- Body panels -->
      <div id="fl-body" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center"></div>

      <!-- Bottom actions -->
      <div style="padding-top:1.5rem">
        <button class="btn gold off" id="fl-save">Save and continue <span style="font-size:1.1em">&#8594;</span></button>
        <div style="text-align:center;margin-top:0.85rem">
          <span id="fl-skip" style="font-size:var(--text-body-sm);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Skip for now</span>
        </div>
      </div>
    </div>
  `
  app.appendChild(view)

  let activeFormat: 'voice' | 'write' | 'photo' = 'voice'
  const tabs = view.querySelectorAll('.format-tab')
  const body = view.querySelector('#fl-body') as HTMLDivElement
  const saveBtn = view.querySelector('#fl-save') as HTMLButtonElement

  // If user is post-onboarding (has childId), they came from S7 — navigate back there
  const flBack = () => getState().childId ? 'v-s7' : 'v-story'
  const flSkipDest = () => getState().childId ? 'v-s7' : 'v-s1'

  view.querySelector('#fl-back')!.addEventListener('click', () => navigate(flBack()))
  view.querySelector('#fl-skip')!.addEventListener('click', () => navigate(flSkipDest()))

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      activeFormat = (tab as HTMLElement).dataset.fmt as 'voice' | 'write' | 'photo'
      renderPanel()
    })
  })

  function renderPanel(): void {
    clearRecording()
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    recordSeconds = 0
    saveBtn.classList.add('off')

    if (activeFormat === 'voice') {
      body.innerHTML = `
        <div style="position:relative;width:140px;height:140px;margin:1rem 0">
          <div style="position:absolute;inset:-18px;border-radius:50%;border:1px solid rgba(200,144,12,0.12);animation:breathe 3s ease-in-out infinite"></div>
          <div style="position:absolute;inset:0;border-radius:50%;border:1px solid rgba(200,144,12,0.2)"></div>
          <div id="fl-rec-btn" style="position:absolute;inset:12px;border-radius:50%;background:linear-gradient(145deg,rgba(200,144,12,0.35),rgba(120,70,0,0.2));border:1.5px solid rgba(200,144,12,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 28px rgba(200,144,12,0.2)">
            ${iconMic(28, 'var(--gold-hi)')}
          </div>
        </div>
        <div style="text-align:center">
          <div style="font-size:var(--text-body);color:var(--body)" id="fl-rec-label">Tap to record</div>
          <div style="font-size:var(--text-meta);color:var(--dim);margin-top:0.15rem">Up to 3 minutes</div>
          <div style="font-size:var(--text-caption);color:var(--dim);margin-top:0.2rem;font-variant-numeric:tabular-nums" id="fl-rec-time"></div>
        </div>
        <div id="fl-rec-preview" style="display:none;width:100%;margin-top:1rem">
          <audio id="fl-rec-audio" controls style="width:100%;margin-bottom:0.5rem"></audio>
          <div style="text-align:center">
            <span id="fl-rec-redo" style="font-size:var(--text-body-sm);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Re-record</span>
          </div>
        </div>
      `

      const recBtn = body.querySelector('#fl-rec-btn') as HTMLDivElement
      const recLabel = body.querySelector('#fl-rec-label') as HTMLDivElement
      const recTime = body.querySelector('#fl-rec-time') as HTMLDivElement
      const recPreview = body.querySelector('#fl-rec-preview') as HTMLDivElement
      const recAudio = body.querySelector('#fl-rec-audio') as HTMLAudioElement

      recBtn.addEventListener('click', async () => {
        if (isRecording()) {
          stopRecording()
          recBtn.innerHTML = iconMic(28, 'var(--gold-hi)')
          recBtn.style.background = 'linear-gradient(145deg,rgba(200,144,12,0.35),rgba(120,70,0,0.2))'
          recBtn.style.borderColor = 'rgba(200,144,12,0.5)'
          recBtn.style.animation = ''
          recLabel.textContent = 'Done'
          if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
          setTimeout(() => {
            const blob = getRecordingBlob()
            if (blob) {
              recAudio.src = URL.createObjectURL(blob)
              recPreview.style.display = ''
              recBtn.parentElement!.style.display = 'none'
              saveBtn.classList.remove('off')
            }
          }, 200)
        } else {
          const ok = await startRecording()
          if (!ok) {
            recLabel.textContent = 'Microphone access denied'
            recLabel.style.color = '#e85454'
            return
          }
          recBtn.innerHTML = `<div style="width:10px;height:10px;border-radius:2px;background:#e85454"></div>`
          recBtn.style.background = 'linear-gradient(145deg,rgba(220,60,60,0.4),rgba(180,30,30,0.25))'
          recBtn.style.borderColor = 'rgba(220,80,80,0.6)'
          recBtn.style.animation = 'pulse 1s ease-in-out infinite'
          recLabel.textContent = 'Recording...'
          recLabel.style.color = 'var(--gold-hi)'
          recordSeconds = 0
          recordTimer = setInterval(() => {
            recordSeconds++
            recTime.textContent = formatDuration(recordSeconds)
            if (recordSeconds >= 180) recBtn.click()
          }, 1000)
        }
      })

      body.querySelector('#fl-rec-redo')?.addEventListener('click', () => {
        clearRecording()
        recPreview.style.display = 'none'
        recBtn.parentElement!.style.display = ''
        recBtn.innerHTML = iconMic(28, 'var(--gold-hi)')
        recBtn.style.background = 'linear-gradient(145deg,rgba(200,144,12,0.35),rgba(120,70,0,0.2))'
        recBtn.style.borderColor = 'rgba(200,144,12,0.5)'
        recBtn.style.animation = ''
        recLabel.textContent = 'Tap to record'
        recLabel.style.color = 'var(--body)'
        recTime.textContent = ''
        saveBtn.classList.add('off')
      })

    } else if (activeFormat === 'write') {
      body.innerHTML = `
        <div style="width:100%">
          <textarea id="fl-text" class="textarea" style="resize:none;min-height:200px;font-size:var(--text-body)" placeholder="Just talk to them. What do you want them to know?" maxlength="1000"></textarea>
          <div style="text-align:right;font-size:var(--text-meta);color:var(--dim);margin-top:0.25rem"><span id="fl-cc">0</span> / 1000</div>
        </div>
      `
      const ta = body.querySelector('#fl-text') as HTMLTextAreaElement
      ta.addEventListener('input', () => {
        (body.querySelector('#fl-cc') as HTMLSpanElement).textContent = String(ta.value.length)
        saveBtn.classList.toggle('off', ta.value.trim().length === 0)
      })

    } else {
      body.innerHTML = `
        <div style="width:100%;text-align:center">
          <div id="fl-photo-preview" style="width:100%;max-height:280px;border-radius:14px;overflow:hidden;margin-bottom:1rem;display:none"></div>
          <input id="fl-photo-file" type="file" accept="image/*" style="display:none" />
          <button id="fl-photo-choose" class="btn">${iconCamera(16)} Choose a photo</button>
        </div>
      `
      const pFile = body.querySelector('#fl-photo-file') as HTMLInputElement
      const pPreview = body.querySelector('#fl-photo-preview') as HTMLDivElement
      const pChoose = body.querySelector('#fl-photo-choose') as HTMLButtonElement

      pChoose.addEventListener('click', () => pFile.click())
      pFile.addEventListener('change', () => {
        const file = pFile.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          pPreview.innerHTML = `<img src="${reader.result}" style="width:100%;display:block" />`
          pPreview.style.display = ''
          pChoose.textContent = 'Change photo'
          saveBtn.classList.remove('off')
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Save first whisper to localStorage (survives magic link redirect)
  // Note: only text content persists through localStorage. Voice/photo blobs
  // are lost on page reload during auth, but work if auth completes in-session.
  saveBtn.addEventListener('click', async () => {
    if (saveBtn.classList.contains('off')) return

    const isPostOnboarding = !!getState().childId

    if (activeFormat === 'write') {
      const text = (body.querySelector('#fl-text') as HTMLTextAreaElement)?.value.trim()
      if (text) {
        if (isPostOnboarding) {
          // Already authenticated — save directly to DB
          saveBtn.innerHTML = '<div class="spinner"></div>'
          saveBtn.classList.add('off')
          try {
            const { saveWhisper } = await import('@/lib/whispers')
            await saveWhisper({ format: 'write', content: text })
            setState({ hasFirstWhisper: true })
          } catch (e) {
            console.error('Could not save whisper:', e)
          }
          navigate('v-s7')
          return
        } else {
          localStorage.setItem('whispers_first_whisper', JSON.stringify({ format: 'write', content: text }))
        }
      }
    }
    // Voice and photo blobs can't be stored in localStorage —
    // they'll be saved after auth if session stays alive

    navigate(isPostOnboarding ? 'v-s7' : 'v-s1')
  })

  // Render initial panel
  renderPanel()
}
