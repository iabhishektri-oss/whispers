import { navigate, onRouteChange } from '@/lib/router'

let currentSlide = 0
let autoTimer: ReturnType<typeof setTimeout> | null = null

export function initStory(): void {
  const app = document.getElementById('app')!
  
  const view = document.createElement('div')
  view.id = 'v-story'
  view.className = 'view'
  view.innerHTML = `
    <style>
      #v-story .slide { position: absolute; inset: 0; display: flex; flex-direction: column; opacity: 0; pointer-events: none; transition: opacity 0.45s ease; }
      #v-story .slide.on { opacity: 1; pointer-events: auto; }
      #v-story .sbody { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.75rem 0; text-align: center; }
      #v-story .scta { padding: 0 1.75rem 2.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
      #v-story .prog { display: flex; gap: 6px; margin-bottom: 2rem; }
      #v-story .prog-seg { height: 3px; flex: 1; background: rgba(200,191,180,0.15); border-radius: 1px; overflow: hidden; }
      #v-story .prog-fill { height: 100%; width: 0%; background: var(--gold-hi); border-radius: 1px; transition: width 0.3s linear; }
      #v-story .npill { display: inline-flex; align-items: center; padding: 0.35rem 0.85rem; border-radius: var(--radius-pill); font-size: var(--text-caption); }
      #v-story .npill.gold { background: rgba(200,144,12,0.12); border: 1px solid rgba(200,144,12,0.3); color: var(--gold-hi); }
      #v-story .npill.lo { background: var(--input-bg); border: 1px solid var(--input-bd); color: var(--dim); }
      #v-story .chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.42rem 0.85rem; border-radius: var(--radius-pill); border: 1px solid var(--input-bd); background: var(--input-bg); font-size: var(--text-caption); color: var(--body); }
      #v-story .quote-card { width: 100%; padding: var(--card-padding); background: rgba(200,144,12,0.07); border: 1px solid rgba(200,144,12,0.2); border-radius: var(--radius-card); }
    </style>

    <!-- SLIDE 1: CLARITY -->
    <div class="slide on" data-slide="0">
      <div class="sbody">
        <div class="prog" id="s-prog"></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;animation:rise 0.5s 0.1s both">
          <span class="wordmark">Whispers</span>
          <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">A memory box<br>for your child's future.</div>
          <div style="font-size:var(--text-body);color:var(--body);line-height:var(--lh-body)">Your family leaves whispers.<br>Voice notes, letters and photos.<br><span style="color:var(--dim)">Your child opens them when they're older.</span></div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center">
            <span class="chip">${micIcon()} Voice notes</span>
            <span class="chip">${writeIcon()} Letters</span>
            <span class="chip">${cameraIcon()} Photos</span>
          </div>
        </div>
      </div>
      <div class="scta">
        <button class="btn" onclick="window.__storyNext()">Continue ${arrow()}</button>
      </div>
    </div>

    <!-- SLIDE 2: EMOTION -->
    <div class="slide" data-slide="1">
      <div class="sbody">
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;animation:rise 0.5s 0.1s both">
          <div style="text-align:center">
            <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">Imagine your child at 15.</div>
            <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25;color:rgba(255,255,255,0.42)">They open their phone.</div>
            <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25;color:rgba(255,255,255,0.2)">They hear her voice.</div>
          </div>
          <div class="quote-card" style="text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.75rem">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--gold);animation:blink 2s infinite"></div>
              <span style="font-size:var(--text-meta);color:var(--dim);letter-spacing:0.06em">Grandma . voice note . 0:34</span>
            </div>
            <div style="font-size:var(--text-body);color:rgba(255,255,255,0.75);line-height:var(--lh-body);font-style:italic">
              I want to tell you about the day you were born.
            </div>
            <div style="font-size:var(--text-meta);color:var(--dim);margin-top:0.5rem">Recorded when you were 7.</div>
          </div>
        </div>
      </div>
      <div class="scta">
        <button class="btn" onclick="window.__storyNext()">Continue ${arrow()}</button>
      </div>
    </div>

    <!-- SLIDE 3: URGENCY -->
    <div class="slide" data-slide="2">
      <div class="sbody">
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;animation:rise 0.5s 0.1s both">
          <div style="display:flex;flex-direction:column;gap:0.75rem;width:100%">
            <div style="display:flex;align-items:center;gap:0.75rem;justify-content:center"><span class="npill gold">Your child</span><span style="font-size:var(--text-body);color:var(--dim)">sounds different every year</span></div>
            <div style="display:flex;align-items:center;gap:0.75rem;justify-content:center"><span class="npill lo">Granny</span><span style="font-size:var(--text-body);color:var(--dim)">has a story only she can tell</span></div>
            <div style="display:flex;align-items:center;gap:0.75rem;justify-content:center"><span class="npill lo">Baba</span><span style="font-size:var(--text-body);color:var(--dim)">has wisdom to pass on</span></div>
            <div style="display:flex;align-items:center;gap:0.75rem;justify-content:center"><span class="npill lo">Naani</span><span style="font-size:var(--text-body);color:var(--dim)">has love to leave behind</span></div>
          </div>
          <div style="text-align:center;margin-top:0.75rem">
            <div class="headline" style="font-size:var(--text-headline)">Every voice here matters.</div>
            <div class="headline" style="font-size:var(--text-headline);color:rgba(255,255,255,0.42)">Not all of them will be here forever.</div>
            <div class="headline" style="font-size:var(--text-headline);color:rgba(255,255,255,0.2)">Whispers keeps them.</div>
          </div>
        </div>
      </div>
      <div class="scta">
        <button class="btn" onclick="window.__storyNext()">Continue ${arrow()}</button>
      </div>
    </div>

    <!-- SLIDE 4: THE ACT -->
    <div class="slide" data-slide="3">
      <div class="sbody">
        <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%;animation:rise 0.5s 0.1s both">
          <div style="text-align:center">
            <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">Start with your voice.</div>
            <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25;color:rgba(255,255,255,0.42)">Thirty seconds. Anything true.</div>
          </div>
          <div style="position:relative;width:96px;height:96px;margin:1rem 0">
            <div style="position:absolute;inset:-14px;border-radius:50%;border:1px solid rgba(200,144,12,0.1);animation:breathe 3s ease-in-out infinite"></div>
            <div style="position:absolute;inset:0;border-radius:50%;border:1px solid rgba(200,144,12,0.2)"></div>
            <div style="position:absolute;inset:10px;border-radius:50%;background:linear-gradient(145deg,rgba(200,144,12,0.3),rgba(120,70,0,0.15));border:1.5px solid rgba(200,144,12,0.4);display:flex;align-items:center;justify-content:center">
              ${micIconLarge()}
            </div>
          </div>
          <div style="font-size:var(--text-meta);color:var(--dim)">Here's a prompt to get you started.</div>
          <div class="quote-card" style="text-align:center">
            <div style="font-size:var(--text-body);color:rgba(255,255,255,0.75);line-height:var(--lh-body);font-style:italic">
              The thing I never want you to forget is...
            </div>
          </div>
        </div>
      </div>
      <div class="scta">
        <button class="btn gold" onclick="window.__storyRecord()">Get started ${arrow()}</button>
      </div>
    </div>
  `

  app.appendChild(view)

  // Build progress bar
  buildProgress()

  // Wire global handlers
  ;(window as any).__storyNext = nextSlide
  ;(window as any).__storyRecord = () => navigate('v-s1')
  ;(window as any).__storySkip = () => navigate('v-s1')

  // Reset story state when navigating back to it
  onRouteChange((_from, to) => {
    if (to === 'v-story') resetStory()
  })
}

function buildProgress(): void {
  const prog = document.getElementById('s-prog')
  if (!prog) return
  prog.innerHTML = ''
  for (let i = 0; i < 4; i++) {
    const seg = document.createElement('div')
    seg.className = 'prog-seg'
    seg.innerHTML = `<div class="prog-fill" id="pf-${i}"></div>`
    prog.appendChild(seg)
  }
  updateProgress()
}

function updateProgress(): void {
  for (let i = 0; i < 4; i++) {
    const fill = document.getElementById(`pf-${i}`)
    if (!fill) continue
    if (i < currentSlide) fill.style.width = '100%'
    else if (i === currentSlide) {
      fill.style.width = '0%'
      fill.style.transition = 'none'
      requestAnimationFrame(() => {
        fill.style.transition = 'width 12s linear'
        fill.style.width = '100%'
      })
    } else {
      fill.style.width = '0%'
    }
  }
}

function showSlide(index: number): void {
  const slides = document.querySelectorAll('#v-story .slide')

  // Phase 1: fade out current slide
  slides.forEach(s => s.classList.remove('on'))
  currentSlide = index

  // Phase 2: after outgoing fade, move progress bar and fade in new slide
  setTimeout(() => {
    const prog = document.getElementById('s-prog')
    if (prog) {
      const currentSlideEl = slides[index]
      const sbody = currentSlideEl?.querySelector('.sbody')
      if (sbody && !sbody.contains(prog)) {
        sbody.insertBefore(prog, sbody.firstChild)
      }
    }

    // Re-trigger rise animation on incoming slide content
    const content = slides[index]?.querySelector('.sbody > div:not(.prog)') as HTMLElement
    if (content) {
      content.style.animation = 'none'
      content.offsetHeight // force reflow
      content.style.animation = 'rise 0.5s 0.1s both'
    }

    slides[index]?.classList.add('on')
    updateProgress()
    startAutoAdvance()
  }, 350)
}

function nextSlide(): void {
  if (currentSlide < 3) {
    showSlide(currentSlide + 1)
  }
}

function startAutoAdvance(): void {
  if (autoTimer) clearTimeout(autoTimer)
  if (currentSlide >= 3) return // Don't auto-advance on last slide
  autoTimer = setTimeout(() => {
    if (currentSlide < 3) nextSlide()
  }, 12000)
}

function resetStory(): void {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
  currentSlide = 0
  const slides = document.querySelectorAll('#v-story .slide')
  slides.forEach(s => s.classList.remove('on'))
  if (slides[0]) slides[0].classList.add('on')
  buildProgress()
  startAutoAdvance()
}

// Inline SVG helpers for this file
function micIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
}
function micIconLarge(): string {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill="rgba(240,184,48,0.15)" stroke="#f0b830" stroke-width="1.5"/><path d="M5 10a7 7 0 0014 0" stroke="#f0b830" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="#f0b830" stroke-width="1.5" stroke-linecap="round"/></svg>`
}
function writeIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5"/></svg>`
}
function cameraIcon(): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.5"/></svg>`
}
function arrow(): string {
  return `<span style="font-size:1.1em">&#8594;</span>`
}
