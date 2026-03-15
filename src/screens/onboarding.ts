import { navigate, onRouteChange } from '@/lib/router'
import { getState, setState, childName } from '@/lib/state'
import { getSupabase } from '@/lib/supabase'
import { iconBack, iconCheck, iconArrow, iconCamera } from '@/lib/icons'

const TOTAL_STEPS = 6

function obHeader(step: number, backId?: string): string {
  const pct = Math.round((step / TOTAL_STEPS) * 100)
  return `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem">
      ${backId ? `<button class="back" id="${backId}">${iconBack()}</button>` : '<div style="width:36px"></div>'}
      <div style="flex:1;height:2px;background:rgba(200,191,180,0.1);border-radius:1px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--gold-hi);border-radius:1px"></div>
      </div>
      <span style="font-size:var(--text-meta);color:var(--dim);white-space:nowrap">${step} of ${TOTAL_STEPS}</span>
    </div>
  `
}

// Footer wrapper: pushes CTA to bottom via margin-top:auto, respects safe area
const footerOpen = `<div style="margin-top:auto;padding-top:1.5rem;padding-bottom:env(safe-area-inset-bottom)">`
const footerClose = `</div>`

function formatDob(dob: string): string {
  if (!dob) return ''
  try {
    const d = new Date(dob + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dob }
}

export function initOnboarding(): void {
  const app = document.getElementById('app')!

  // Onboarding-specific styles
  const style = document.createElement('style')
  style.textContent = `
    .ob-opt {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-button);
      border: 1px solid var(--input-bd);
      background: var(--input-bg);
      font-family: var(--font-body);
      font-size: var(--text-body);
      color: var(--body);
      cursor: pointer;
      transition: all var(--duration);
    }
    .ob-opt .ob-check { display: none; }
    .ob-opt.sel {
      background: rgba(200,144,12,0.12);
      border-color: rgba(200,144,12,0.18);
      color: var(--gold-hi);
    }
    .ob-opt.sel .ob-check { display: inline-flex; }
    .input:-webkit-autofill,
    .input:-webkit-autofill:hover,
    .input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #161310 inset !important;
      -webkit-text-fill-color: #ffffff !important;
      caret-color: var(--gold-hi);
      transition: background-color 5000s ease-in-out 0s;
    }
  `
  document.head.appendChild(style)

  // ── S1: Child name ──
  const s1 = document.createElement('div')
  s1.id = 'v-s1'
  s1.className = 'view'
  s1.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(1)}
      <span class="wordmark" style="margin-bottom:2rem">Whispers</span>
      <div class="headline" style="margin-bottom:0.5rem">What is your child's name?</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">First name only. This is how we'll refer to them.</p>
      <input id="ob-name" class="input" type="text" placeholder="First name" style="margin-bottom:1.5rem" maxlength="40" autocomplete="off" />
      ${footerOpen}
        <button id="ob-name-next" class="btn gold off">Continue <span style="font-size:1.1em">${iconArrow()}</span></button>
      ${footerClose}
    </div>
  `
  app.appendChild(s1)

  const nameInput = s1.querySelector('#ob-name') as HTMLInputElement
  const nameBtn = s1.querySelector('#ob-name-next') as HTMLButtonElement
  nameInput.addEventListener('input', () => {
    nameBtn.classList.toggle('off', nameInput.value.trim().length === 0)
  })
  nameBtn.addEventListener('click', () => {
    const val = nameInput.value.trim()
    if (!val) return
    setState({ name: val })
    navigate('v-s2')
  })

  // ── S2: Date of birth ──
  const s2 = document.createElement('div')
  s2.id = 'v-s2'
  s2.className = 'view'
  s2.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(2, 'ob-s2-back')}
      <div id="s2-ctx" style="font-size:var(--text-caption);color:var(--dim);margin-bottom:1.5rem"></div>
      <div class="headline" style="margin-bottom:0.5rem">When was <span id="s2-name"></span> born?</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">So we know how old they are when each whisper arrives.</p>
      <input id="ob-dob" class="input" type="date" style="display:block;width:100%;box-sizing:border-box;-webkit-appearance:none;appearance:none;min-height:3.65rem;margin-bottom:1.5rem" />
      ${footerOpen}
        <button id="ob-dob-next" class="btn gold off">Continue <span style="font-size:1.1em">${iconArrow()}</span></button>
      ${footerClose}
    </div>
  `
  app.appendChild(s2)

  const dobInput = s2.querySelector('#ob-dob') as HTMLInputElement
  const dobBtn = s2.querySelector('#ob-dob-next') as HTMLButtonElement
  dobInput.addEventListener('change', () => {
    dobBtn.classList.toggle('off', !dobInput.value)
  })
  s2.querySelector('#ob-s2-back')!.addEventListener('click', () => navigate('v-s1'))
  dobBtn.addEventListener('click', () => {
    const dob = dobInput.value
    if (!dob) return
    setState({ dob })
    navigate('v-s3')
  })

  // ── S3: Pronouns ──
  const s3 = document.createElement('div')
  s3.id = 'v-s3'
  s3.className = 'view'
  s3.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(3, 'ob-s3-back')}
      <div id="s3-ctx" style="font-size:var(--text-caption);color:var(--dim);margin-bottom:1.5rem"></div>
      <div class="headline" style="margin-bottom:0.5rem">Which pronouns for <span id="s3-name"></span>?</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">This is how we'll refer to <span id="s3-name2"></span> in whispers from family.</p>
      <div style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.5rem">
        <button class="ob-opt sel" data-pronoun="they"><span class="ob-check">${iconCheck(14)}</span> They / them</button>
        <button class="ob-opt" data-pronoun="she"><span class="ob-check">${iconCheck(14)}</span> She / her</button>
        <button class="ob-opt" data-pronoun="he"><span class="ob-check">${iconCheck(14)}</span> He / him</button>
      </div>
      ${footerOpen}
        <button id="ob-pronoun-next" class="btn gold">Continue <span style="font-size:1.1em">${iconArrow()}</span></button>
      ${footerClose}
    </div>
  `
  app.appendChild(s3)

  let selectedPronoun = 'they'
  const pronounPills = s3.querySelectorAll('[data-pronoun]')
  pronounPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pronounPills.forEach(p => p.classList.remove('sel'))
      pill.classList.add('sel')
      selectedPronoun = (pill as HTMLElement).dataset.pronoun || 'they'
    })
  })
  s3.querySelector('#ob-s3-back')!.addEventListener('click', () => navigate('v-s2'))
  s3.querySelector('#ob-pronoun-next')!.addEventListener('click', () => {
    setState({ pronoun: selectedPronoun })
    navigate('v-s4')
  })

  // ── S4: Parent info ──
  const s4 = document.createElement('div')
  s4.id = 'v-s4'
  s4.className = 'view'
  s4.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(4, 'ob-s4-back')}
      <div id="s4-ctx" style="font-size:var(--text-caption);color:var(--dim);margin-bottom:1.5rem"></div>
      <div class="headline" style="margin-bottom:0.5rem">And who are you?</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">Your name and what <span id="s4-name"></span> calls you.</p>
      <input id="ob-keeper" class="input" type="text" placeholder="Your name" style="margin-bottom:0.75rem" maxlength="40" autocomplete="off" />
      <input id="ob-rel" class="input" type="text" placeholder="e.g. Mum, Dad, Papa, Mama" style="margin-bottom:1.5rem" maxlength="40" autocomplete="off" />
      ${footerOpen}
        <button id="ob-keeper-next" class="btn gold off">Continue <span style="font-size:1.1em">${iconArrow()}</span></button>
      ${footerClose}
    </div>
  `
  app.appendChild(s4)

  const keeperInput = s4.querySelector('#ob-keeper') as HTMLInputElement
  const relInput = s4.querySelector('#ob-rel') as HTMLInputElement
  const keeperBtn = s4.querySelector('#ob-keeper-next') as HTMLButtonElement

  function checkS4() {
    keeperBtn.classList.toggle('off', keeperInput.value.trim().length === 0)
  }
  keeperInput.addEventListener('input', checkS4)
  relInput.addEventListener('input', checkS4)

  s4.querySelector('#ob-s4-back')!.addEventListener('click', () => navigate('v-s3'))
  keeperBtn.addEventListener('click', () => {
    const k = keeperInput.value.trim()
    if (!k) return
    setState({ keeper: k, relationship: relInput.value.trim() })
    navigate('v-s5')
  })

  // ── S5: Child photo ──
  const s5 = document.createElement('div')
  s5.id = 'v-s5'
  s5.className = 'view'
  s5.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(5, 'ob-s5-back')}
      <div id="s5-ctx" style="font-size:var(--text-caption);color:var(--dim);margin-bottom:1.5rem"></div>
      <div class="headline" style="margin-bottom:0.5rem">Add a photo of <span id="s5-name"></span></div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">This becomes their collection avatar. You can change it later.</p>
      <div id="ob-photo-preview" style="width:120px;height:120px;border-radius:var(--radius-circle);background:var(--input-bg);border:2px dashed var(--input-bd);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;overflow:hidden;cursor:pointer;color:var(--dim)">
        ${iconCamera(32, 'var(--dim)')}
      </div>
      <input id="ob-photo-file" type="file" accept="image/*" style="display:none" />
      ${footerOpen}
        <button id="ob-photo-choose" class="btn" style="margin-bottom:0.75rem">${iconCamera(16)} Choose photo</button>
        <button id="ob-photo-next" class="btn gold" style="margin-bottom:0.75rem;display:none">Continue <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="ob-photo-skip" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px;display:block;text-align:center">Skip for now</span>
      ${footerClose}
    </div>
  `
  app.appendChild(s5)

  const photoFile = s5.querySelector('#ob-photo-file') as HTMLInputElement
  const photoPreview = s5.querySelector('#ob-photo-preview') as HTMLDivElement
  const photoChoose = s5.querySelector('#ob-photo-choose') as HTMLButtonElement
  const photoNext = s5.querySelector('#ob-photo-next') as HTMLButtonElement

  photoChoose.addEventListener('click', () => photoFile.click())
  photoPreview.addEventListener('click', () => photoFile.click())
  photoFile.addEventListener('change', () => {
    const file = photoFile.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      photoPreview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover" />`
      setState({ photo: url })
      photoChoose.style.display = 'none'
      photoNext.style.display = ''
    }
    reader.readAsDataURL(file)
  })

  s5.querySelector('#ob-s5-back')!.addEventListener('click', () => navigate('v-s4'))
  photoNext.addEventListener('click', () => navigate('v-s6'))
  s5.querySelector('#ob-photo-skip')!.addEventListener('click', () => navigate('v-s6'))

  // ── S6: Email / magic link ──
  const s6 = document.createElement('div')
  s6.id = 'v-s6'
  s6.className = 'view'
  s6.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(6, 'ob-s6-back')}
      <div id="s6-ctx" style="font-size:var(--text-caption);color:var(--dim);margin-bottom:1.5rem"></div>
      <div class="headline" style="margin-bottom:0.5rem">Last step. Your email.</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">We'll send a magic link. No password needed.</p>
      <input id="ob-email" class="input" type="email" placeholder="you@example.com" style="margin-bottom:1.5rem" autocomplete="email" />
      ${footerOpen}
        <button id="ob-email-send" class="btn gold off" style="margin-bottom:0.75rem">Send magic link <span style="font-size:1.1em">${iconArrow()}</span></button>
        <div id="ob-email-status" style="font-size:var(--text-caption);color:var(--dim);display:none;text-align:center"></div>
      ${footerClose}
    </div>
  `
  app.appendChild(s6)

  const emailInput = s6.querySelector('#ob-email') as HTMLInputElement
  const emailBtn = s6.querySelector('#ob-email-send') as HTMLButtonElement
  const emailStatus = s6.querySelector('#ob-email-status') as HTMLDivElement

  emailInput.addEventListener('input', () => {
    emailBtn.classList.toggle('off', !emailInput.value.includes('@'))
  })

  s6.querySelector('#ob-s6-back')!.addEventListener('click', () => navigate('v-s5'))
  emailBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    if (!email.includes('@')) return
    setState({ email })

    // Save onboarding state to localStorage for post-auth pickup
    const s = getState()
    localStorage.setItem('whispers_onboarding', JSON.stringify({
      name: s.name,
      dob: s.dob,
      pronoun: s.pronoun,
      keeper: s.keeper,
      relationship: s.relationship,
      email: s.email,
      photo: s.photo,
    }))

    emailBtn.innerHTML = '<div class="spinner"></div>'
    emailBtn.classList.add('off')

    const sb = getSupabase()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })

    if (error) {
      emailStatus.style.display = 'block'
      emailStatus.style.color = '#e85454'
      emailStatus.textContent = 'Could not send link. Please try again.'
      emailBtn.innerHTML = `Send magic link <span style="font-size:1.1em">${iconArrow()}</span>`
      emailBtn.classList.remove('off')
    } else {
      emailStatus.style.display = 'block'
      emailStatus.style.color = 'var(--gold-hi)'
      emailStatus.textContent = 'Check your inbox. Tap the link to continue.'
      emailBtn.innerHTML = `Link sent ${iconCheck(16)}`
    }
  })

  // ── S7: Ceremony (centred — moment screen) ──
  const s7 = document.createElement('div')
  s7.id = 'v-s7'
  s7.className = 'view'
  s7.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;align-items:center;gap:1.25rem">
        <div id="s7-avatar" class="avatar avatar-lg" style="width:80px;height:80px;font-size:var(--text-display-lg);margin-bottom:0.5rem"></div>
        <div class="headline" style="font-size:var(--text-display-lg);line-height:1.25">
          <span id="s7-childname"></span>'s collection<br>is ready.
        </div>
        <p style="color:var(--body);font-size:var(--text-body);line-height:var(--lh-body)">
          Every whisper you and your family leave here will be kept safe for <span id="s7-childname2"></span>.
        </p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;margin-top:0.5rem">
          <span class="pill active">${iconCheck(14)} Collection created</span>
          <span class="pill active">${iconCheck(14)} You're in</span>
          <span id="s7-pill-whisper" class="pill active" style="display:none">${iconCheck(14)} First whisper saved</span>
        </div>
        <div class="card" style="margin-top:1rem;text-align:center">
          <div class="headline-sm" style="margin-bottom:0.35rem">Now, bring in the people who matter.</div>
          <p style="font-size:var(--text-caption);color:var(--dim);line-height:var(--lh-body)">Grandparents, aunts, uncles, anyone who loves <span id="s7-childname3"></span>. They can leave whispers without creating an account.</p>
        </div>
      </div>
      <div style="position:absolute;bottom:2.75rem;left:1.5rem;right:1.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding-bottom:env(safe-area-inset-bottom)">
        <button id="ob-s7-invite" class="btn gold">Invite family <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="ob-s7-skip" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">or leave the first whisper yourself</span>
      </div>
    </div>
  `
  app.appendChild(s7)

  s7.querySelector('#ob-s7-invite')!.addEventListener('click', () => navigate('v-s8'))
  s7.querySelector('#ob-s7-skip')!.addEventListener('click', () => navigate('v-first-letter'))

  // ── S8: Invite contributor (functional — left-aligned) ──
  const s8 = document.createElement('div')
  s8.id = 'v-s8'
  s8.className = 'view'
  s8.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      ${obHeader(6, 'ob-s8-back')}
      <div class="headline" style="margin-bottom:0.5rem">Who is leaving<br>their first whisper?</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">They get a private link. No account needed.</p>

      <div class="label" style="margin-bottom:0.5rem">What does your child call them?</div>
      <input id="ob-inv-nick" class="input" type="text" placeholder="e.g. Nani, Dadi, Granny, Pop..." style="margin-bottom:0.35rem" maxlength="40" autocomplete="off" />
      <p style="color:var(--dim);font-size:var(--text-caption);margin-bottom:1.5rem">This is how their name appears on every whisper.</p>

      <div class="label" style="margin-bottom:0.5rem">Their relationship to your child</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.5rem">
        <div class="format-tab" data-rel="Maternal grandmother" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Maternal grandmother</span>
        </div>
        <div class="format-tab" data-rel="Paternal grandmother" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Paternal grandmother</span>
        </div>
        <div class="format-tab" data-rel="Maternal grandfather" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Maternal grandfather</span>
        </div>
        <div class="format-tab" data-rel="Paternal grandfather" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Paternal grandfather</span>
        </div>
        <div class="format-tab" data-rel="Aunt" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Aunt</span>
        </div>
        <div class="format-tab" data-rel="Uncle" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Uncle</span>
        </div>
        <div class="format-tab" data-rel="Godparent" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Godparent</span>
        </div>
        <div class="format-tab" data-rel="Family friend" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Family friend</span>
        </div>
        <div class="format-tab" data-rel="Other" style="padding:0.75rem 0.5rem;grid-column:1 / -1">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Other</span>
        </div>
      </div>

      ${footerOpen}
        <button id="ob-inv-create" class="btn gold off" style="margin-bottom:0.75rem">Generate their link <span style="font-size:1.1em">${iconArrow()}</span></button>
        <div id="ob-inv-status" style="font-size:var(--text-caption);color:var(--dim);display:none;text-align:center"></div>
      ${footerClose}
    </div>
  `
  app.appendChild(s8)

  let s8SelectedRel = ''
  const invNick = s8.querySelector('#ob-inv-nick') as HTMLInputElement
  const invCreate = s8.querySelector('#ob-inv-create') as HTMLButtonElement
  const invStatus = s8.querySelector('#ob-inv-status') as HTMLDivElement

  function updateS8Button(): void {
    invCreate.classList.toggle('off', !s8SelectedRel || invNick.value.trim().length === 0)
  }

  // Wire relationship cards
  s8.querySelectorAll('.format-tab[data-rel]').forEach(card => {
    card.addEventListener('click', () => {
      s8.querySelectorAll('.format-tab[data-rel]').forEach(c => c.classList.remove('active'))
      card.classList.add('active')
      s8SelectedRel = (card as HTMLElement).dataset.rel || ''
      updateS8Button()
    })
  })

  invNick.addEventListener('input', updateS8Button)

  s8.querySelector('#ob-s8-back')!.addEventListener('click', () => navigate('v-s7'))
  invCreate.addEventListener('click', async () => {
    const nick = invNick.value.trim()
    if (!nick || !s8SelectedRel) return
    const rel = s8SelectedRel
    const { childId } = getState()
    if (!childId) return

    invCreate.innerHTML = '<div class="spinner"></div>'
    invCreate.classList.add('off')

    const token = crypto.randomUUID()
    const sb = getSupabase()
    const { error } = await sb.from('contributors').insert({
      child_id: childId,
      nickname: nick,
      relationship: rel || null,
      invite_token: token,
    })

    if (error) {
      invStatus.style.display = 'block'
      invStatus.style.color = '#e85454'
      invStatus.textContent = 'Could not create invite. Try again.'
      invCreate.innerHTML = `Generate their link <span style="font-size:1.1em">${iconArrow()}</span>`
      invCreate.classList.remove('off')
    } else {
      const link = `${window.location.origin}?token=${token}`
      setState({ _lastInviteLink: link } as any)
      navigate('v-s9')
    }
  })

  // ── S9: Share link (centred — moment screen) ──
  const s9 = document.createElement('div')
  s9.id = 'v-s9'
  s9.className = 'view'
  s9.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:2rem;padding-bottom:2rem">
      <button class="back" id="s9-back">${iconBack()}</button>
      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;gap:1.25rem;width:100%;margin-top:1.5rem">
        <div class="headline">Send them their link.</div>
        <p style="color:var(--dim);font-size:var(--text-body);line-height:var(--lh-body)">They open it, leave a whisper. No account needed.</p>

        <div class="card" style="width:100%;display:flex;align-items:center;gap:0.75rem;word-break:break-all" id="s9-link-card">
          <span id="s9-link-text" style="flex:1;font-size:var(--text-body);color:var(--body)"></span>
          <button id="s9-copy" style="flex-shrink:0;padding:0.45rem 1rem;border:1px solid var(--border);border-radius:var(--radius-button);background:transparent;color:var(--gold-hi);font-family:var(--font-body);font-size:var(--text-caption);font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;white-space:nowrap">Copy</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:0.6rem">
          <button id="s9-whatsapp" style="padding:0.85rem 1rem;border:1px solid rgba(37,211,102,0.3);border-radius:var(--radius-button);background:rgba(37,211,102,0.08);color:#25D366;font-family:var(--font-body);font-size:var(--text-body-sm);font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.716-1.244A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.143 0-4.144-.663-5.787-1.8l-.404-.263-3.088.814.83-3.032-.29-.462A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Send via WhatsApp
          </button>
          <button id="s9-imessage" style="padding:0.85rem 1rem;border:1px solid var(--input-bd);border-radius:var(--radius-button);background:var(--input-bg);color:var(--body);font-family:var(--font-body);font-size:var(--text-body-sm);font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 5.813 2 10.5c0 2.51 1.17 4.757 3.007 6.342C4.672 18.6 3.9 20.3 2 22c2.7 0 5.3-1.3 6.7-2.5.86.17 1.74.3 2.63.3h.67c5.523 0 10-3.813 10-8.5S17.523 2 12 2z"/></svg>
            Send via iMessage
          </button>
        </div>

        <textarea id="s9-note" class="textarea" placeholder="Add a note (optional)" style="margin-top:0.5rem"></textarea>
      </div>

      <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding-top:2rem;padding-bottom:env(safe-area-inset-bottom)">
        <button id="s9-send" class="btn gold off">Share the link first</button>
        <span id="s9-done" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Skip, I'll do this later</span>
      </div>
    </div>
  `
  app.appendChild(s9)

  const s9LinkText = s9.querySelector('#s9-link-text') as HTMLSpanElement
  const s9Copy = s9.querySelector('#s9-copy') as HTMLButtonElement

  s9Copy.addEventListener('click', async () => {
    const link = s9LinkText.textContent || ''
    try {
      await navigator.clipboard.writeText(link)
      s9Copy.textContent = 'Copied!'
      setTimeout(() => { s9Copy.textContent = 'Copy' }, 2000)
      const sendBtn = s9.querySelector('#s9-send') as HTMLButtonElement
      sendBtn.classList.remove('off')
      sendBtn.innerHTML = `Done, go to my whispers <span style="font-size:1.1em">${iconArrow()}</span>`
    } catch {
      const range = document.createRange()
      range.selectNodeContents(s9LinkText)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  s9.querySelector('#s9-back')!.addEventListener('click', () => navigate('v-s8'))

  s9.querySelector('#s9-whatsapp')!.addEventListener('click', () => {
    const link = s9LinkText.textContent || ''
    const note = (s9.querySelector('#s9-note') as HTMLTextAreaElement)?.value || ''
    const text = note ? `${note}\n\n${link}` : `You're invited to leave a whisper for ${childName()}.\n\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    const sendBtn = s9.querySelector('#s9-send') as HTMLButtonElement
    sendBtn.classList.remove('off')
    sendBtn.innerHTML = `Done, go to my whispers <span style="font-size:1.1em">${iconArrow()}</span>`
  })

  s9.querySelector('#s9-imessage')!.addEventListener('click', () => {
    const link = s9LinkText.textContent || ''
    const note = (s9.querySelector('#s9-note') as HTMLTextAreaElement)?.value || ''
    const text = note ? `${note} ${link}` : `You're invited to leave a whisper for ${childName()}. ${link}`
    window.open(`sms:&body=${encodeURIComponent(text)}`, '_self')
    const sendBtn = s9.querySelector('#s9-send') as HTMLButtonElement
    sendBtn.classList.remove('off')
    sendBtn.innerHTML = `Done, go to my whispers <span style="font-size:1.1em">${iconArrow()}</span>`
  })

  s9.querySelector('#s9-send')!.addEventListener('click', () => {
    const sendBtn = s9.querySelector('#s9-send') as HTMLButtonElement
    if (sendBtn.classList.contains('off')) return
    navigate('v-keeper')
  })
  s9.querySelector('#s9-done')!.addEventListener('click', () => navigate('v-keeper'))

  // ── Dynamic data updates on navigation ──
  onRouteChange((_from, to) => {
    const s = getState()
    const name = s.name || 'your child'

    // Update all name spans
    const nameSpanIds = ['s2-name', 's3-name', 's3-name2', 's4-name', 's5-name', 's7-childname', 's7-childname2', 's7-childname3']
    for (const id of nameSpanIds) {
      const el = document.getElementById(id)
      if (el) el.textContent = name
    }

    // Update context lines — show what we know so far
    const dobStr = s.dob ? formatDob(s.dob) : ''
    const ctxParts: string[] = []
    if (s.name) ctxParts.push(s.name)
    if (dobStr) ctxParts.push('born ' + dobStr)
    const ctxText = ctxParts.join(', ')

    // S2 context: just the name
    const s2Ctx = document.getElementById('s2-ctx')
    if (s2Ctx) s2Ctx.textContent = s.name || ''

    // S3+ context: name + DOB if available
    for (const id of ['s3-ctx', 's4-ctx', 's5-ctx', 's6-ctx']) {
      const el = document.getElementById(id)
      if (el) el.textContent = ctxText
    }

    // S7 avatar + dynamic content
    if (to === 'v-s7') {
      const avatar = document.getElementById('s7-avatar')
      if (avatar) {
        if (s.photo) {
          avatar.innerHTML = `<img src="${s.photo}" style="width:100%;height:100%;border-radius:var(--radius-circle);object-fit:cover" />`
        } else {
          avatar.textContent = (s.name || '?')[0].toUpperCase()
        }
      }

      // Show/hide "First whisper saved" pill
      const whisperPill = document.getElementById('s7-pill-whisper')
      if (whisperPill) whisperPill.style.display = s.hasFirstWhisper ? '' : 'none'

      // Hide "or leave the first whisper yourself" if they already left one
      const skipLink = document.getElementById('ob-s7-skip')
      if (skipLink) skipLink.style.display = s.hasFirstWhisper ? 'none' : ''
    }

    // S9 link
    if (to === 'v-s9') {
      const link = (getState() as any)._lastInviteLink || ''
      s9LinkText.textContent = link
    }
  })
}
