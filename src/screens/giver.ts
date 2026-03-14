import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { saveWhisper } from '@/lib/whispers'
import { startRecording, stopRecording, getRecordingBlob, clearRecording, isRecording } from '@/lib/recorder'
import { iconMic, iconWrite, iconCamera, iconCheck, iconArrow } from '@/lib/icons'
import { escHtml, formatDuration } from '@/lib/utils'

let recordTimer: ReturnType<typeof setInterval> | null = null
let recordSeconds = 0

export function initGiver(): void {
  const app = document.getElementById('app')!

  // Landing
  const landing = document.createElement('div')
  landing.id = 'v-giver'
  landing.className = 'view'
  landing.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%">
        <span class="wordmark" style="margin-bottom:0.5rem">Whispers</span>
        <div id="gv-avatar" class="avatar avatar-lg" style="width:72px;height:72px;font-size:var(--text-display-md)"></div>
        <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">
          Leave a whisper for<br><span id="gv-childname"></span>
        </div>
        <p style="color:var(--body);font-size:var(--text-body);line-height:var(--lh-body)">
          <span id="gv-keeper"></span> invited you to leave a voice note, letter, or photo for <span id="gv-childname2"></span>.
          They'll keep it safe and open it when they're older.
        </p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center">
          <span class="pill">${iconMic(14)} Voice</span>
          <span class="pill">${iconWrite(14)} Letter</span>
          <span class="pill">${iconCamera(14)} Photo</span>
        </div>
      </div>
      <div style="position:absolute;bottom:2.75rem;left:1.5rem;right:1.5rem">
        <button id="gv-start" class="btn gold">Leave a whisper <span style="font-size:1.1em">${iconArrow()}</span></button>
      </div>
    </div>
  `
  app.appendChild(landing)

  landing.querySelector('#gv-start')!.addEventListener('click', () => navigate('v-giver-compose'))

  // Compose
  const compose = document.createElement('div')
  compose.id = 'v-giver-compose'
  compose.className = 'view'
  compose.innerHTML = `
    <div class="shell" style="padding-top:2rem;padding-bottom:2rem;min-height:100dvh">
      <span class="wordmark" style="display:block;text-align:center;margin-bottom:1.5rem">Whispers</span>
      <div class="headline-sm" style="text-align:center;margin-bottom:1.25rem">Your whisper for <span id="gvc-name"></span></div>
      <div class="format-tabs" id="gvc-tabs">
        <div class="format-tab active" data-fmt="write">${iconWrite(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Write</span></div>
        <div class="format-tab" data-fmt="voice">${iconMic(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Voice</span></div>
        <div class="format-tab" data-fmt="photo">${iconCamera(18)} <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Photo</span></div>
      </div>
      <div id="gvc-body"></div>
      <button id="gvc-save" class="btn gold off" style="margin-top:1.25rem">Send whisper</button>
      <div id="gvc-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
    </div>
  `
  app.appendChild(compose)

  let activeFormat: 'write' | 'voice' | 'photo' = 'write'
  const tabs = compose.querySelectorAll('.format-tab')
  const body = compose.querySelector('#gvc-body') as HTMLDivElement
  const saveBtn = compose.querySelector('#gvc-save') as HTMLButtonElement
  const statusEl = compose.querySelector('#gvc-status') as HTMLDivElement

  function renderGiverBody(): void {
    clearRecording()
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    recordSeconds = 0
    statusEl.style.display = 'none'

    if (activeFormat === 'write') {
      body.innerHTML = `
        <textarea id="gvc-text" class="textarea" placeholder="Write something for ${escHtml(childName())}..." maxlength="1000" style="min-height:160px"></textarea>
        <div style="text-align:right;font-size:var(--text-meta);color:var(--dim);margin-top:0.25rem"><span id="gvc-wcount">0</span>/1000</div>
      `
      const ta = body.querySelector('#gvc-text') as HTMLTextAreaElement
      ta.addEventListener('input', () => {
        (body.querySelector('#gvc-wcount') as HTMLSpanElement).textContent = String(ta.value.length)
        saveBtn.classList.toggle('off', ta.value.trim().length === 0)
      })
      saveBtn.classList.add('off')
    } else if (activeFormat === 'voice') {
      body.innerHTML = `
        <div style="text-align:center;padding:1.5rem 0">
          <div id="gvc-rec-status" style="font-size:var(--text-body);color:var(--dim);margin-bottom:1rem">Tap to start recording</div>
          <div id="gvc-rec-time" style="font-size:var(--text-display-xl);font-family:var(--font-display);font-style:italic;color:var(--white);margin-bottom:1rem">0:00</div>
          <button id="gvc-rec-btn" class="btn" style="width:auto;padding:0.75rem 2rem;margin:0 auto">${iconMic(18)} Record</button>
          <div id="gvc-rec-preview" style="display:none;margin-top:1rem">
            <audio id="gvc-rec-audio" controls style="width:100%;margin-bottom:0.5rem"></audio>
            <button id="gvc-rec-redo" class="btn" style="width:auto;padding:0.5rem 1.5rem;margin:0 auto;font-size:var(--text-meta)">Record again</button>
          </div>
        </div>
      `
      saveBtn.classList.add('off')

      const recBtn = body.querySelector('#gvc-rec-btn') as HTMLButtonElement
      const recStatus = body.querySelector('#gvc-rec-status') as HTMLDivElement
      const recTime = body.querySelector('#gvc-rec-time') as HTMLDivElement
      const recPreview = body.querySelector('#gvc-rec-preview') as HTMLDivElement
      const recAudio = body.querySelector('#gvc-rec-audio') as HTMLAudioElement

      recBtn.addEventListener('click', async () => {
        if (isRecording()) {
          stopRecording()
          recBtn.innerHTML = `${iconMic(18)} Record`
          recStatus.textContent = 'Done'
          if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
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
            if (recordSeconds >= 180) recBtn.click()
          }, 1000)
        }
      })

      body.querySelector('#gvc-rec-redo')?.addEventListener('click', () => {
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
      body.innerHTML = `
        <div style="text-align:center">
          <div id="gvc-photo-preview" style="width:100%;max-height:300px;border-radius:var(--radius-card);overflow:hidden;margin-bottom:1rem;display:none"></div>
          <input id="gvc-photo-file" type="file" accept="image/*" style="display:none" />
          <button id="gvc-photo-choose" class="btn">${iconCamera(16)} Choose photo</button>
          <textarea id="gvc-photo-caption" class="textarea" placeholder="Add a caption (optional)" maxlength="1000" style="margin-top:1rem;min-height:60px;display:none"></textarea>
        </div>
      `
      saveBtn.classList.add('off')

      const pFile = body.querySelector('#gvc-photo-file') as HTMLInputElement
      const pPreview = body.querySelector('#gvc-photo-preview') as HTMLDivElement
      const pChoose = body.querySelector('#gvc-photo-choose') as HTMLButtonElement
      const pCaption = body.querySelector('#gvc-photo-caption') as HTMLTextAreaElement

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
      renderGiverBody()
    })
  })

  saveBtn.addEventListener('click', async () => {
    if (saveBtn.classList.contains('off')) return
    saveBtn.innerHTML = '<div class="spinner"></div>'
    saveBtn.classList.add('off')
    statusEl.style.display = 'none'

    try {
      const { giverContributorId } = getState()
      let result

      if (activeFormat === 'write') {
        const text = (body.querySelector('#gvc-text') as HTMLTextAreaElement)?.value.trim()
        result = await saveWhisper({ format: 'write', content: text, contributorId: giverContributorId })
      } else if (activeFormat === 'voice') {
        const blob = getRecordingBlob()
        result = await saveWhisper({ format: 'voice', audioBlob: blob, contributorId: giverContributorId })
      } else {
        const file = (body.querySelector('#gvc-photo-file') as HTMLInputElement)?.files?.[0]
        const caption = (body.querySelector('#gvc-photo-caption') as HTMLTextAreaElement)?.value.trim()
        result = await saveWhisper({ format: 'photo', photoFile: file, content: caption || null, contributorId: giverContributorId })
      }

      if (result.success) {
        clearRecording()
        navigate('v-giver-done')
      } else {
        statusEl.style.display = 'block'
        statusEl.style.color = '#e85454'
        statusEl.textContent = result.error || 'Could not save. Try again.'
        saveBtn.innerHTML = 'Send whisper'
        saveBtn.classList.remove('off')
      }
    } catch (e) {
      console.error('[Giver] Save failed:', e)
      statusEl.style.display = 'block'
      statusEl.style.color = '#e85454'
      statusEl.textContent = 'Something went wrong. Please try again.'
      saveBtn.innerHTML = 'Send whisper'
      saveBtn.classList.remove('off')
    }
  })

  // Done screen
  const done = document.createElement('div')
  done.id = 'v-giver-done'
  done.className = 'view'
  done.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;align-items:center;gap:1.25rem">
          <div style="color:var(--gold-hi)">${iconCheck(56)}</div>
          <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">Whisper saved</div>
          <p style="color:var(--body);font-size:var(--text-body);line-height:var(--lh-body)">
            <span id="gvd-childname"></span> will hear this one day. Thank you for being part of their story.
          </p>
        </div>
      </div>
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding-top:1.5rem">
        <button id="gvd-another" class="btn">Leave another whisper <span style="font-size:1.1em">${iconArrow()}</span></button>
        <button id="gvd-done" class="btn gold">I am done</button>
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--input-bd);width:100%;text-align:center">
          <p style="font-size:var(--text-caption);color:var(--dim);margin-bottom:0.75rem">Want to start a collection for your own family?</p>
          <button id="gvd-start-own" class="btn">Start your own Whispers <span style="font-size:1.1em">${iconArrow()}</span></button>
        </div>
      </div>
    </div>
  `
  app.appendChild(done)

  done.querySelector('#gvd-another')!.addEventListener('click', () => {
    activeFormat = 'write'
    tabs.forEach(t => t.classList.remove('active'))
    tabs[0]?.classList.add('active')
    // Reset save button state
    saveBtn.innerHTML = 'Send whisper'
    saveBtn.classList.add('off')
    statusEl.style.display = 'none'
    renderGiverBody()
    navigate('v-giver-compose')
  })

  done.querySelector('#gvd-done')!.addEventListener('click', () => {
    // Show a final thank you
    const shell = done.querySelector('.shell') as HTMLDivElement
    shell.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;animation:rise 0.5s both">
        <span class="wordmark" style="margin-bottom:1.5rem">Whispers</span>
        <div class="headline" style="font-size:var(--text-headline)">Thank you</div>
        <p style="color:var(--dim);font-size:var(--text-body);margin-top:0.75rem">You can close this window.</p>
      </div>
    `
  })

  done.querySelector('#gvd-start-own')!.addEventListener('click', () => {
    // Navigate to a clean start
    window.location.href = window.location.origin
  })

  // Update dynamic content on route change
  onRouteChange((_from, to) => {
    const s = getState()
    const name = escHtml(childName())

    if (to === 'v-giver') {
      const avatar = landing.querySelector('#gv-avatar') as HTMLDivElement
      avatar.textContent = (s.name || '?')[0].toUpperCase()
      const spans = ['gv-childname', 'gv-childname2']
      spans.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.textContent = s.name || 'this child'
      })
      const keeperEl = document.getElementById('gv-keeper')
      if (keeperEl) keeperEl.textContent = keeperName()
    }

    if (to === 'v-giver-compose') {
      const nameEl = compose.querySelector('#gvc-name')
      if (nameEl) nameEl.textContent = s.name || 'this child'
      // Reset save button for fresh compose session
      saveBtn.innerHTML = 'Send whisper'
      saveBtn.classList.add('off')
      statusEl.style.display = 'none'
      renderGiverBody()
    }

    if (to === 'v-giver-done') {
      const el = document.getElementById('gvd-childname')
      if (el) el.textContent = s.name || 'This child'
    }
  })
}
