import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { getSupabase } from '@/lib/supabase'
import { saveWhisper } from '@/lib/whispers'
import { startRecording, stopRecording, getRecordingBlob, clearRecording, isRecording } from '@/lib/recorder'
import { iconCamera, iconMic, iconWrite, iconBack, iconCheck } from '@/lib/icons'
import { escHtml, dailyPrompt, formatDuration, timeAgo } from '@/lib/utils'
import { renderTimeline, TimelineWhisper } from '@/lib/timeline'

let recordTimer: ReturnType<typeof setInterval> | null = null
let recordSeconds = 0

export function initChildMode(): void {
  const app = document.getElementById('app')!

  const view = document.createElement('div')
  view.id = 'v-child-mode'
  view.className = 'view'
  view.innerHTML = `
    <div style="min-height:100dvh;background:linear-gradient(180deg, #1a1510 0%, #211814 30%, #2a1c14 60%, #1a1510 100%);position:relative;overflow:hidden">
      <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,183,77,0.06) 0%,transparent 70%);pointer-events:none"></div>
      <div style="position:absolute;bottom:20%;left:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(200,144,12,0.04) 0%,transparent 70%);pointer-events:none"></div>
      <!-- Decorative atmosphere circles -->
      <div style="position:absolute;top:60px;right:30px;width:12px;height:12px;border-radius:50%;background:rgba(255,183,77,0.08);pointer-events:none"></div>
      <div style="position:absolute;top:140px;left:20px;width:8px;height:8px;border-radius:50%;background:rgba(206,147,216,0.08);pointer-events:none"></div>
      <div style="position:absolute;top:90px;left:55%;width:14px;height:14px;border-radius:50%;background:rgba(255,183,77,0.06);pointer-events:none"></div>

      <div class="shell" style="padding-top:1.25rem;padding-bottom:2rem;position:relative">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
          <button class="back" id="cm-back">${iconBack()}</button>
          <div>
            <div style="font-family:var(--font-display);font-style:italic;font-weight:500;font-size:1.5rem;color:var(--white);line-height:var(--lh-headline)" id="cm-title"></div>
            <div style="font-size:0.78rem;color:var(--dim)">From the people who love you</div>
          </div>
        </div>

        <!-- Daily prompt -->
        <div style="text-align:center;margin-bottom:1.5rem;padding:var(--card-padding);background:linear-gradient(135deg, rgba(255,183,77,0.12), rgba(200,144,12,0.08));border:1px solid rgba(255,183,77,0.15);border-radius:20px">
          <div style="font-family:var(--font-display);font-style:italic;font-size:1.2rem;color:var(--body);line-height:var(--lh-headline)" id="cm-prompt"></div>
        </div>

        <!-- Action buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;margin-bottom:2rem">
          <button class="cm-action-btn" id="cm-btn-camera" style="height:80px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;cursor:pointer;transition:all var(--duration)">
            <span style="color:var(--body)">${iconCamera(24)}</span>
            <span style="font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--body);font-family:var(--font-body)">Photo</span>
          </button>
          <button class="cm-action-btn" id="cm-btn-voice" style="height:80px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;cursor:pointer;transition:all var(--duration)">
            <span style="color:var(--body)">${iconMic(24)}</span>
            <span style="font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--body);font-family:var(--font-body)">Voice</span>
          </button>
          <button class="cm-action-btn" id="cm-btn-write" style="height:80px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;cursor:pointer;transition:all var(--duration)">
            <span style="color:var(--body)">${iconWrite(24)}</span>
            <span style="font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--body);font-family:var(--font-body)">Write</span>
          </button>
        </div>

        <!-- Incoming whispers from family -->
        <div style="margin-bottom:1rem">
          <div style="font-size:0.68rem;font-weight:500;letter-spacing:0.15em;text-transform:uppercase;color:var(--dim);font-family:var(--font-body);margin-bottom:0.75rem">From the people who love you</div>
          <div id="cm-family-feed" style="display:flex;flex-direction:column;gap:0.6rem">
            <div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-caption)">Loading...</div>
          </div>
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
    msg.style.cssText = 'text-align:center;padding:var(--card-padding);background:linear-gradient(135deg, rgba(255,183,77,0.12), rgba(200,144,12,0.08));border:1px solid rgba(255,183,77,0.15);border-radius:16px;animation:rise 0.4s both'
    msg.innerHTML = `
      <div style="color:var(--gold-hi);margin-bottom:0.5rem">${iconCheck(32)}</div>
      <div style="font-size:var(--text-body);color:var(--white)">Saved to your collection</div>
    `
    // Refresh feed after brief delay to ensure DB commit
    setTimeout(() => loadFamilyWhispers(), 500)
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
      setTimeout(() => loadFamilyWhispers(), 1000)
      return
    }

    if (error) {
      console.error('Child mode feed error:', error)
      setTimeout(() => loadFamilyWhispers(), 1000)
      return
    }

    // Show all unsealed whispers (from both keeper and contributors)
    const whispers = (data || []).filter((w: any) => !w.sealed).slice(0, 20) as TimelineWhisper[]
    if (whispers.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-caption)">
          No whispers from family yet. Invite someone to leave one!
        </div>
      `
      return
    }

    function renderChildCard(w: TimelineWhisper): string {
      const from = w.contributors?.nickname || keeperName()
      const ago = timeAgo(w.created_at)
      let body = ''
      if (w.format === 'write') {
        body = `<p style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body);white-space:pre-wrap;margin-top:0.5rem">${escHtml(w.content || '')}</p>`
      } else if (w.format === 'voice') {
        body = `
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0">
            <button class="pill active" data-play="${escHtml(w.audio_url || '')}" style="cursor:pointer;border-radius:var(--radius-child)">${iconMic(14)} Play</button>
          </div>
        `
      } else if (w.format === 'photo') {
        body = `
          ${w.photo_url ? `<img src="${escHtml(w.photo_url)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-top:0.5rem" />` : ''}
          ${w.content ? `<p style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body);margin-top:0.5rem">${escHtml(w.content)}</p>` : ''}
        `
      }

      return `
        <div style="padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;animation:rise 0.3s both">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div class="avatar avatar-sm">${from[0]?.toUpperCase() || '?'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:var(--text-caption);font-weight:500;color:var(--white)">${escHtml(from)}</div>
              <div style="font-size:var(--text-meta);color:var(--dim)">${ago}</div>
            </div>
          </div>
          ${body}
        </div>
      `
    }

    feed.innerHTML = renderTimeline(whispers, getState().dob, renderChildCard)

    // Wire audio play buttons
    feed.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = (btn as HTMLElement).dataset.play!
        if (!url) return
        const audio = new Audio(url)
        audio.play().catch(() => {})
        btn.innerHTML = '&#9632; Playing...'
        audio.addEventListener('ended', () => {
          btn.innerHTML = '&#9654; Play'
        })
      })
    })
  }

  onRouteChange((_from, to) => {
    if (to === 'v-child-mode') {
      const title = view.querySelector('#cm-title')
      if (title) title.textContent = `${childName()}'s space`
      const prompt = view.querySelector('#cm-prompt')
      if (prompt) prompt.textContent = `${childName()}, ${dailyPrompt().charAt(0).toLowerCase()}${dailyPrompt().slice(1)}`
      loadFamilyWhispers()
    }
  })

  // Refresh feed when app returns from background
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && view.classList.contains('active')) {
      loadFamilyWhispers()
    }
  })
}
