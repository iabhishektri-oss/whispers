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
          <span class="pill active">${iconCheck(14)} First keeper added</span>
        </div>
      </div>
      <div style="position:absolute;bottom:2.75rem;left:1.5rem;right:1.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding-bottom:env(safe-area-inset-bottom)">
        <button id="ob-s7-invite" class="btn gold">Invite family <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="ob-s7-skip" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Go to home</span>
      </div>
    </div>
  `
  app.appendChild(s7)

  s7.querySelector('#ob-s7-invite')!.addEventListener('click', () => navigate('v-s8'))
  s7.querySelector('#ob-s7-skip')!.addEventListener('click', () => navigate('v-keeper'))

  // ── S8: Invite contributor (functional — left-aligned) ──
  const s8 = document.createElement('div')
  s8.id = 'v-s8'
  s8.className = 'view'
  s8.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:1rem;padding-bottom:0">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem">
        <button class="back" id="ob-s8-back">${iconBack()}</button>
      </div>
      <div class="headline" style="margin-bottom:0.5rem">Invite someone who loves <span id="s8-name"></span></div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">Grandparents, aunts, uncles, family friends. They can leave a whisper without an account.</p>
      <input id="ob-inv-nick" class="input" type="text" placeholder="Their name (e.g. Grandma)" style="margin-bottom:0.75rem" maxlength="40" autocomplete="off" />
      <input id="ob-inv-rel" class="input" type="text" placeholder="Relationship (e.g. Grandmother)" style="margin-bottom:1.5rem" maxlength="40" autocomplete="off" />
      ${footerOpen}
        <button id="ob-inv-create" class="btn gold off" style="margin-bottom:0.75rem">Create invite link <span style="font-size:1.1em">${iconArrow()}</span></button>
        <div id="ob-inv-status" style="font-size:var(--text-caption);color:var(--dim);display:none;text-align:center"></div>
      ${footerClose}
    </div>
  `
  app.appendChild(s8)

  const invNick = s8.querySelector('#ob-inv-nick') as HTMLInputElement
  const invRel = s8.querySelector('#ob-inv-rel') as HTMLInputElement
  const invCreate = s8.querySelector('#ob-inv-create') as HTMLButtonElement
  const invStatus = s8.querySelector('#ob-inv-status') as HTMLDivElement

  invNick.addEventListener('input', () => {
    invCreate.classList.toggle('off', invNick.value.trim().length === 0)
  })

  s8.querySelector('#ob-s8-back')!.addEventListener('click', () => navigate('v-s7'))
  invCreate.addEventListener('click', async () => {
    const nick = invNick.value.trim()
    if (!nick) return
    const rel = invRel.value.trim()
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
      invCreate.innerHTML = `Create invite link <span style="font-size:1.1em">${iconArrow()}</span>`
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
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%">
        <div style="color:var(--gold-hi)">${iconCheck(48)}</div>
        <div class="headline" style="margin-bottom:0.25rem">Invite created</div>
        <p style="color:var(--body);font-size:var(--text-body);line-height:var(--lh-body)">Share this link. They can leave a whisper in under two minutes.</p>
        <div class="card" style="width:100%;word-break:break-all;font-size:var(--text-caption);color:var(--gold-hi);text-align:left;cursor:pointer" id="s9-link-card">
          <span id="s9-link-text"></span>
        </div>
        <button id="s9-copy" class="btn" style="margin-top:0.5rem">Copy link</button>
        <button id="s9-share" class="btn" style="display:none">Share</button>
      </div>
      <div style="position:absolute;bottom:2.75rem;left:1.5rem;right:1.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding-bottom:env(safe-area-inset-bottom)">
        <button id="s9-another" class="btn">Invite another <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="s9-done" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Go to home</span>
      </div>
    </div>
  `
  app.appendChild(s9)

  const s9LinkText = s9.querySelector('#s9-link-text') as HTMLSpanElement
  const s9Copy = s9.querySelector('#s9-copy') as HTMLButtonElement
  const s9Share = s9.querySelector('#s9-share') as HTMLButtonElement

  s9Copy.addEventListener('click', async () => {
    const link = s9LinkText.textContent || ''
    try {
      await navigator.clipboard.writeText(link)
      s9Copy.innerHTML = `Copied ${iconCheck(16)}`
      setTimeout(() => { s9Copy.innerHTML = 'Copy link' }, 2000)
    } catch {
      const range = document.createRange()
      range.selectNodeContents(s9LinkText)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  if (typeof navigator.share === 'function') {
    s9Share.style.display = ''
    s9Share.addEventListener('click', () => {
      const link = s9LinkText.textContent || ''
      navigator.share({
        title: `Leave a whisper for ${childName()}`,
        text: `${getState().keeper} invited you to leave a whisper for ${childName()}.`,
        url: link,
      }).catch(() => {})
    })
  }

  s9.querySelector('#s9-another')!.addEventListener('click', () => {
    invNick.value = ''
    invRel.value = ''
    invCreate.innerHTML = `Create invite link <span style="font-size:1.1em">${iconArrow()}</span>`
    invCreate.classList.add('off')
    invStatus.style.display = 'none'
    navigate('v-s8')
  })
  s9.querySelector('#s9-done')!.addEventListener('click', () => navigate('v-keeper'))

  // ── First letter (functional — left-aligned) ──
  const fl = document.createElement('div')
  fl.id = 'v-first-letter'
  fl.className = 'view'
  fl.innerHTML = `
    <div class="shell" style="display:flex;flex-direction:column;min-height:100dvh;padding-top:2rem;padding-bottom:0">
      <span class="wordmark" style="margin-bottom:2rem">Whispers</span>
      <div class="headline" style="margin-bottom:0.5rem">Write your first whisper</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:1.5rem">Something true. Something you never want them to forget.</p>
      <textarea id="fl-text" class="textarea" placeholder="The thing I never want you to forget is..." maxlength="1000" style="margin-bottom:0.5rem"></textarea>
      <div style="text-align:right;width:100%;font-size:var(--text-meta);color:var(--dim);margin-bottom:1.5rem"><span id="fl-count">0</span>/1000</div>
      ${footerOpen}
        <button id="fl-save" class="btn gold off">Save and continue <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="fl-skip" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px;margin-top:0.75rem;display:block;text-align:center">Skip for now</span>
      ${footerClose}
    </div>
  `
  app.appendChild(fl)

  const flText = fl.querySelector('#fl-text') as HTMLTextAreaElement
  const flCount = fl.querySelector('#fl-count') as HTMLSpanElement
  const flSave = fl.querySelector('#fl-save') as HTMLButtonElement

  flText.addEventListener('input', () => {
    const len = flText.value.length
    flCount.textContent = String(len)
    flSave.classList.toggle('off', len === 0)
  })

  flSave.addEventListener('click', () => {
    const content = flText.value.trim()
    if (!content) return
    localStorage.setItem('whispers_first_whisper', JSON.stringify({ format: 'write', content }))
    navigate('v-s1')
  })

  fl.querySelector('#fl-skip')!.addEventListener('click', () => navigate('v-s1'))

  // ── Dynamic data updates on navigation ──
  onRouteChange((_from, to) => {
    const s = getState()
    const name = s.name || 'your child'

    // Update all name spans
    const nameSpanIds = ['s2-name', 's3-name', 's3-name2', 's4-name', 's5-name', 's7-childname', 's7-childname2', 's8-name']
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

    // S7 avatar
    if (to === 'v-s7') {
      const avatar = document.getElementById('s7-avatar')
      if (avatar) {
        if (s.photo) {
          avatar.innerHTML = `<img src="${s.photo}" style="width:100%;height:100%;border-radius:var(--radius-circle);object-fit:cover" />`
        } else {
          avatar.textContent = (s.name || '?')[0].toUpperCase()
        }
      }
    }

    // S9 link
    if (to === 'v-s9') {
      const link = (getState() as any)._lastInviteLink || ''
      s9LinkText.textContent = link
    }
  })
}
