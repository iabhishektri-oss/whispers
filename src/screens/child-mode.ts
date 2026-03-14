import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { getSupabase } from '@/lib/supabase'
import { saveWhisper } from '@/lib/whispers'
import { startRecording, stopRecording, getRecordingBlob, clearRecording, isRecording } from '@/lib/recorder'
import { iconCamera, iconMic, iconWrite, iconBack, iconCheck } from '@/lib/icons'
import { escHtml, dailyPrompt, formatDuration, timeAgo } from '@/lib/utils'

let recordTimer: ReturnType<typeof setInterval> | null = null
let recordSeconds = 0

export function initChildMode(): void {
  const app = document.getElementById('app')!

  const view = document.createElement('div')
  view.id = 'v-child-mode'
  view.className = 'view'
  view.innerHTML = `
    <div class="shell" style="padding-top:1.25rem;padding-bottom:2rem;min-height:100dvh">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <button class="back" id="cm-back">${iconBack()}</button>
        <div>
          <div style="font-size:var(--text-body);font-weight:500;color:var(--white)" id="cm-title"></div>
          <div style="font-size:var(--text-meta);color:var(--dim)">Your space</div>
        </div>
      </div>

      <!-- Daily prompt -->
      <div class="card-gold" style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:var(--text-label);color:var(--dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">Today's prompt</div>
        <div style="font-family:var(--font-display);font-style:italic;font-size:var(--text-headline-sm);color:var(--white);line-height:var(--lh-headline)" id="cm-prompt"></div>
      </div>

      <!-- Action buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;margin-bottom:2rem">
        <button class="format-tab" id="cm-btn-camera" style="padding:1.25rem 0.5rem">
          ${iconCamera(24)}
          <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Draw</span>
        </button>
        <button class="format-tab" id="cm-btn-voice" style="padding:1.25rem 0.5rem">
          ${iconMic(24)}
          <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Voice</span>
        </button>
        <button class="format-tab" id="cm-btn-write" style="padding:1.25rem 0.5rem">
          ${iconWrite(24)}
          <span style="font-size:var(--text-label);letter-spacing:0.08em;text-transform:uppercase">Write</span>
        </button>
      </div>

      <!-- Incoming whispers from family -->
      <div style="margin-bottom:1rem">
        <div class="label" style="margin-bottom:0.75rem">Whispers from your family</div>
        <div id="cm-family-feed" style="display:flex;flex-direction:column;gap:0.6rem">
          <div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-caption)">Loading...</div>
        </div>
      </div>
    </div>

    <!-- Child compose overlay -->
    <div class="sheet-overlay" id="cm-sheet-overlay">
      <div class="sheet" id="cm-sheet">
        <div class="sheet-handle"></div>
        <div id="cm-sheet-content"></div>
      </div>
    </div>
  `
  app.appendChild(view)

  const overlay = view.querySelector('#cm-sheet-overlay') as HTMLDivElement
  const sheetContent = view.querySelector('#cm-sheet-content') as HTMLDivElement

  view.querySelector('#cm-back')!.addEventListener('click', () => navigate('v-keeper'))

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeChildSheet()
  })

  // Camera/draw - capture photo of drawing
  view.querySelector('#cm-btn-camera')!.addEventListener('click', () => {
    openChildSheet('photo')
  })

  view.querySelector('#cm-btn-voice')!.addEventListener('click', () => {
    openChildSheet('voice')
  })

  view.querySelector('#cm-btn-write')!.addEventListener('click', () => {
    openChildSheet('write')
  })

  function openChildSheet(mode: 'photo' | 'voice' | 'write'): void {
    if (mode === 'write') {
      sheetContent.innerHTML = `
        <div class="headline-sm" style="text-align:center;margin-bottom:1rem">Write something</div>
        <textarea id="cm-write-text" class="textarea" placeholder="What's on your mind?" maxlength="1000" style="min-height:140px;border-radius:var(--radius-child)"></textarea>
        <div style="text-align:right;font-size:var(--text-meta);color:var(--dim);margin:0.25rem 0 1rem"><span id="cm-wcount">0</span>/1000</div>
        <button id="cm-write-save" class="btn gold off">Save</button>
        <div id="cm-write-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
      `
      const ta = sheetContent.querySelector('#cm-write-text') as HTMLTextAreaElement
      const saveBtn = sheetContent.querySelector('#cm-write-save') as HTMLButtonElement
      const statusEl = sheetContent.querySelector('#cm-write-status') as HTMLDivElement

      ta.addEventListener('input', () => {
        (sheetContent.querySelector('#cm-wcount') as HTMLSpanElement).textContent = String(ta.value.length)
        saveBtn.classList.toggle('off', ta.value.trim().length === 0)
      })

      saveBtn.addEventListener('click', async () => {
        if (saveBtn.classList.contains('off')) return
        saveBtn.innerHTML = '<div class="spinner"></div>'
        saveBtn.classList.add('off')
        try {
          const result = await saveWhisper({ format: 'write', content: ta.value.trim() })
          if (result.success) {
            closeChildSheet()
            showChildSuccess()
          } else {
            statusEl.style.display = 'block'
            statusEl.style.color = '#e85454'
            statusEl.textContent = result.error || 'Could not save.'
            saveBtn.innerHTML = 'Save'
            saveBtn.classList.remove('off')
          }
        } catch (e) {
          console.error('[ChildMode] Write save failed:', e)
          statusEl.style.display = 'block'
          statusEl.style.color = '#e85454'
          statusEl.textContent = 'Something went wrong. Please try again.'
          saveBtn.innerHTML = 'Save'
          saveBtn.classList.remove('off')
        }
      })
    } else if (mode === 'voice') {
      clearRecording()
      recordSeconds = 0
      sheetContent.innerHTML = `
        <div class="headline-sm" style="text-align:center;margin-bottom:1rem">Record your voice</div>
        <div style="text-align:center;padding:1rem 0">
          <div id="cm-rec-status" style="font-size:var(--text-body);color:var(--dim);margin-bottom:1rem">Tap to start</div>
          <div id="cm-rec-time" style="font-size:var(--text-display-xl);font-family:var(--font-display);font-style:italic;color:var(--white);margin-bottom:1rem">0:00</div>
          <button id="cm-rec-btn" class="btn" style="width:auto;padding:0.75rem 2rem;margin:0 auto;border-radius:var(--radius-child)">${iconMic(18)} Record</button>
          <div id="cm-rec-preview" style="display:none;margin-top:1rem">
            <audio id="cm-rec-audio" controls style="width:100%;margin-bottom:0.5rem"></audio>
          </div>
        </div>
        <button id="cm-voice-save" class="btn gold off" style="margin-top:1rem">Save</button>
        <div id="cm-voice-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
      `

      const recBtn = sheetContent.querySelector('#cm-rec-btn') as HTMLButtonElement
      const recStatus = sheetContent.querySelector('#cm-rec-status') as HTMLDivElement
      const recTime = sheetContent.querySelector('#cm-rec-time') as HTMLDivElement
      const recPreview = sheetContent.querySelector('#cm-rec-preview') as HTMLDivElement
      const recAudio = sheetContent.querySelector('#cm-rec-audio') as HTMLAudioElement
      const saveBtn = sheetContent.querySelector('#cm-voice-save') as HTMLButtonElement
      const statusEl = sheetContent.querySelector('#cm-voice-status') as HTMLDivElement

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

      saveBtn.addEventListener('click', async () => {
        if (saveBtn.classList.contains('off')) return
        saveBtn.innerHTML = '<div class="spinner"></div>'
        saveBtn.classList.add('off')
        try {
          const blob = getRecordingBlob()
          const result = await saveWhisper({ format: 'voice', audioBlob: blob })
          if (result.success) {
            closeChildSheet()
            clearRecording()
            showChildSuccess()
          } else {
            statusEl.style.display = 'block'
            statusEl.style.color = '#e85454'
            statusEl.textContent = result.error || 'Could not save.'
            saveBtn.innerHTML = 'Save'
            saveBtn.classList.remove('off')
          }
        } catch (e) {
          console.error('[ChildMode] Voice save failed:', e)
          statusEl.style.display = 'block'
          statusEl.style.color = '#e85454'
          statusEl.textContent = 'Something went wrong. Please try again.'
          saveBtn.innerHTML = 'Save'
          saveBtn.classList.remove('off')
        }
      })
    } else {
      // Photo (capture drawing)
      sheetContent.innerHTML = `
        <div class="headline-sm" style="text-align:center;margin-bottom:1rem">Save a drawing or photo</div>
        <div style="text-align:center">
          <div id="cm-photo-preview" style="width:100%;max-height:300px;border-radius:var(--radius-child);overflow:hidden;margin-bottom:1rem;display:none"></div>
          <input id="cm-photo-file" type="file" accept="image/*" style="display:none" />
          <button id="cm-photo-choose" class="btn" style="border-radius:var(--radius-child)">${iconCamera(16)} Take photo</button>
        </div>
        <button id="cm-photo-save" class="btn gold off" style="margin-top:1rem;border-radius:var(--radius-child)">Save</button>
        <div id="cm-photo-status" style="font-size:var(--text-caption);color:var(--dim);text-align:center;margin-top:0.5rem;display:none"></div>
      `
      const pFile = sheetContent.querySelector('#cm-photo-file') as HTMLInputElement
      const pPreview = sheetContent.querySelector('#cm-photo-preview') as HTMLDivElement
      const pChoose = sheetContent.querySelector('#cm-photo-choose') as HTMLButtonElement
      const saveBtn = sheetContent.querySelector('#cm-photo-save') as HTMLButtonElement
      const statusEl = sheetContent.querySelector('#cm-photo-status') as HTMLDivElement

      pChoose.addEventListener('click', () => pFile.click())
      pFile.addEventListener('change', () => {
        const file = pFile.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          pPreview.innerHTML = `<img src="${reader.result}" style="width:100%;display:block" />`
          pPreview.style.display = ''
          saveBtn.classList.remove('off')
        }
        reader.readAsDataURL(file)
      })

      saveBtn.addEventListener('click', async () => {
        if (saveBtn.classList.contains('off')) return
        saveBtn.innerHTML = '<div class="spinner"></div>'
        saveBtn.classList.add('off')
        try {
          const file = pFile.files?.[0]
          const result = await saveWhisper({ format: 'photo', photoFile: file })
          if (result.success) {
            closeChildSheet()
            showChildSuccess()
          } else {
            statusEl.style.display = 'block'
            statusEl.style.color = '#e85454'
            statusEl.textContent = result.error || 'Could not save.'
            saveBtn.innerHTML = 'Save'
            saveBtn.classList.remove('off')
          }
        } catch (e) {
          console.error('[ChildMode] Photo save failed:', e)
          statusEl.style.display = 'block'
          statusEl.style.color = '#e85454'
          statusEl.textContent = 'Something went wrong. Please try again.'
          saveBtn.innerHTML = 'Save'
          saveBtn.classList.remove('off')
        }
      })
    }

    overlay.classList.add('open')
  }

  function closeChildSheet(): void {
    overlay.classList.remove('open')
    if (isRecording()) stopRecording()
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
    clearRecording()
  }

  function showChildSuccess(): void {
    const feed = view.querySelector('#cm-family-feed') as HTMLDivElement
    const msg = document.createElement('div')
    msg.className = 'card-gold'
    msg.style.textAlign = 'center'
    msg.style.animation = 'rise 0.4s both'
    msg.innerHTML = `
      <div style="color:var(--gold-hi);margin-bottom:0.5rem">${iconCheck(32)}</div>
      <div style="font-size:var(--text-body);color:var(--white)">Saved to your collection</div>
    `
    feed.insertBefore(msg, feed.firstChild)
    setTimeout(() => msg.remove(), 3000)
  }

  async function loadFamilyWhispers(): Promise<void> {
    const { childId } = getState()
    if (!childId) return

    const feed = view.querySelector('#cm-family-feed') as HTMLDivElement
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
      console.error('Child mode feed exception:', e)
      feed.innerHTML = `<div style="text-align:center;padding:1rem 0;color:var(--dim);font-size:var(--text-caption)">Could not load whispers.</div>`
      return
    }

    if (error) {
      console.error('Child mode feed error:', error)
      feed.innerHTML = `<div style="text-align:center;padding:1rem 0;color:var(--dim);font-size:var(--text-caption)">Could not load.</div>`
      return
    }

    // Show all unsealed whispers (from both keeper and contributors)
    const whispers = (data || []).filter((w: any) => !w.sealed).slice(0, 20)
    if (whispers.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-caption)">
          No whispers from family yet. Invite someone to leave one!
        </div>
      `
      return
    }

    feed.innerHTML = whispers.map((w: any) => {
      const from = w.contributors?.nickname || keeperName()
      const ago = timeAgo(w.created_at)
      let preview = ''
      if (w.format === 'write') preview = escHtml((w.content || '').slice(0, 80))
      else if (w.format === 'voice') preview = 'Voice note'
      else if (w.format === 'photo') preview = 'Photo'

      return `
        <div class="card" style="animation:rise 0.3s both">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div class="avatar avatar-sm">${from[0]?.toUpperCase() || '?'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:var(--text-caption);font-weight:500;color:var(--white)">${escHtml(from)}</div>
              <div style="font-size:var(--text-meta);color:var(--dim)">${preview} . ${ago}</div>
            </div>
          </div>
        </div>
      `
    }).join('')
  }

  onRouteChange((_from, to) => {
    if (to === 'v-child-mode') {
      const title = view.querySelector('#cm-title')
      if (title) title.textContent = `${childName()}'s space`
      const prompt = view.querySelector('#cm-prompt')
      if (prompt) prompt.textContent = dailyPrompt()
      loadFamilyWhispers()
    }
  })
}
