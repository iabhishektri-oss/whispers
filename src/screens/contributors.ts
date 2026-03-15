import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { getSupabase, markSuccess, markFailure } from '@/lib/supabase'
import { iconBack, iconPlus, iconCheck, iconFamily, iconArrow } from '@/lib/icons'
import { escHtml } from '@/lib/utils'

interface ContributorRow {
  id: string
  nickname: string
  relationship: string | null
  invite_token: string
  created_at: string
  whisper_count?: number
}

export function initContributors(): void {
  const app = document.getElementById('app')!

  // Main list view
  const view = document.createElement('div')
  view.id = 'v-contributors'
  view.className = 'view'
  view.innerHTML = `
    <div class="shell" style="padding-top:1.25rem;padding-bottom:2rem;min-height:100dvh">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
        <button class="back" id="ct-back">${iconBack()}</button>
        <div>
          <div style="font-size:var(--text-body);font-weight:500;color:var(--white)">Family</div>
          <div style="font-size:var(--text-meta);color:var(--dim)" id="ct-subtitle"></div>
        </div>
      </div>

      <div id="ct-list" style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.5rem">
        <div style="text-align:center;padding:2rem 0;color:var(--dim);font-size:var(--text-body)">
          <div class="spinner" style="margin:0 auto 1rem"></div>
          Loading...
        </div>
      </div>

      <button id="ct-invite" class="btn gold">${iconPlus(16)} Invite someone</button>
    </div>
  `
  app.appendChild(view)

  view.querySelector('#ct-back')!.addEventListener('click', () => navigate('v-keeper'))
  view.querySelector('#ct-invite')!.addEventListener('click', () => navigate('v-ct-invite'))

  // Invite flow
  const invite = document.createElement('div')
  invite.id = 'v-ct-invite'
  invite.className = 'view'
  invite.innerHTML = `
    <div class="shell" style="padding-top:1.25rem;padding-bottom:2rem;min-height:100dvh;display:flex;flex-direction:column">
      <button class="back" id="ct-inv-back" style="align-self:flex-start">${iconBack()}</button>

      <div class="headline" style="margin-top:1rem;margin-bottom:0.35rem" id="ct-inv-headline"></div>
      <p style="color:var(--dim);font-size:var(--text-body);line-height:var(--lh-body);margin-bottom:1.5rem">Pick their relationship. They can leave whispers without creating an account.</p>

      <!-- Grandparents -->
      <div class="label" style="margin-bottom:0.5rem">Grandparents</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.25rem">
        <div class="format-tab" data-rel="Maternal Grandmother" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-meta);color:var(--dim)">Maternal</span>
          <span style="font-size:var(--text-body-sm);color:var(--white)">Grandmother</span>
        </div>
        <div class="format-tab" data-rel="Maternal Grandfather" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-meta);color:var(--dim)">Maternal</span>
          <span style="font-size:var(--text-body-sm);color:var(--white)">Grandfather</span>
        </div>
        <div class="format-tab" data-rel="Paternal Grandmother" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-meta);color:var(--dim)">Paternal</span>
          <span style="font-size:var(--text-body-sm);color:var(--white)">Grandmother</span>
        </div>
        <div class="format-tab" data-rel="Paternal Grandfather" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-meta);color:var(--dim)">Paternal</span>
          <span style="font-size:var(--text-body-sm);color:var(--white)">Grandfather</span>
        </div>
      </div>

      <!-- Family -->
      <div class="label" style="margin-bottom:0.5rem">Family</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:1.25rem">
        <div class="format-tab" data-rel="Aunt" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Aunt</span>
        </div>
        <div class="format-tab" data-rel="Uncle" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Uncle</span>
        </div>
        <div class="format-tab" data-rel="Godparent" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Godparent</span>
        </div>
      </div>

      <!-- Close to the family -->
      <div class="label" style="margin-bottom:0.5rem">Close to the family</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.5rem">
        <div class="format-tab" data-rel="Family friend" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Family friend</span>
        </div>
        <div class="format-tab" data-rel="Someone else" style="padding:0.75rem 0.5rem">
          <span style="font-size:var(--text-body-sm);color:var(--white)">Someone else</span>
        </div>
      </div>

      <!-- Name input -->
      <div class="label" style="margin-bottom:0.4rem" id="ct-inv-name-label"></div>
      <input id="ct-inv-nick" class="input" type="text" placeholder="e.g. Nani, Grandma T, Chacha, Auntie Jo" maxlength="40" autocomplete="off" style="margin-bottom:1.5rem" />

      <div style="margin-top:auto">
        <button id="ct-inv-create" class="btn off">Create invite link <span style="font-size:1.1em">${iconArrow()}</span></button>
        <div id="ct-inv-status" style="font-size:var(--text-caption);color:var(--dim);display:none;margin-top:0.5rem"></div>
      </div>
    </div>
  `
  app.appendChild(invite)

  let selectedRel = ''
  const invNick = invite.querySelector('#ct-inv-nick') as HTMLInputElement
  const invCreate = invite.querySelector('#ct-inv-create') as HTMLButtonElement
  const invStatus = invite.querySelector('#ct-inv-status') as HTMLDivElement

  function updateInviteButton(): void {
    invCreate.classList.toggle('off', !selectedRel || invNick.value.trim().length === 0)
  }

  // Wire all relationship cards
  invite.querySelectorAll('.format-tab[data-rel]').forEach(card => {
    card.addEventListener('click', () => {
      invite.querySelectorAll('.format-tab[data-rel]').forEach(c => c.classList.remove('active'))
      card.classList.add('active')
      selectedRel = (card as HTMLElement).dataset.rel || ''
      updateInviteButton()
    })
  })

  invNick.addEventListener('input', updateInviteButton)

  invite.querySelector('#ct-inv-back')!.addEventListener('click', () => navigate('v-contributors'))

  invCreate.addEventListener('click', async () => {
    const nick = invNick.value.trim()
    if (!nick || !selectedRel) return
    const rel = selectedRel
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
      navigate('v-ct-share')
      // Set link in share screen after navigation
      setTimeout(() => {
        const linkText = document.getElementById('ct-share-link-text')
        if (linkText) linkText.textContent = link
      }, 50)
    }
  })

  // Share screen
  const share = document.createElement('div')
  share.id = 'v-ct-share'
  share.className = 'view'
  share.innerHTML = `
    <div class="shell" style="padding-top:1.25rem;padding-bottom:2rem;min-height:100dvh;display:flex;flex-direction:column">
      <button class="back" id="ct-share-back">${iconBack()}</button>

      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;width:100%;margin-top:1rem">
        <div class="headline" style="margin-bottom:0.35rem">Invite created</div>
        <p style="color:var(--dim);font-size:var(--text-body);line-height:var(--lh-body);margin-bottom:1.5rem">Share this link. They can leave a whisper in under two minutes.</p>

        <div class="card" style="width:100%;display:flex;align-items:center;gap:0.75rem;word-break:break-all;margin-bottom:1rem" id="ct-share-link-card">
          <span id="ct-share-link-text" style="flex:1;font-size:var(--text-caption);color:var(--gold-hi);cursor:pointer"></span>
          <button id="ct-share-copy" style="flex-shrink:0;padding:0.45rem 1rem;border:1px solid var(--border);border-radius:var(--radius-button);background:transparent;color:var(--gold-hi);font-family:var(--font-body);font-size:var(--text-caption);font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;white-space:nowrap">Copy</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.5rem">
          <button id="ct-share-whatsapp" class="btn" style="font-size:var(--text-body-sm);letter-spacing:0.08em;text-transform:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25D366" stroke-width="1.5"/></svg>
            WhatsApp
          </button>
          <button id="ct-share-imessage" class="btn" style="font-size:var(--text-body-sm);letter-spacing:0.08em;text-transform:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            iMessage
          </button>
        </div>

        <div class="label" style="margin-bottom:0.4rem">Add a note (optional)</div>
        <textarea id="ct-share-note" class="textarea" placeholder="A short message so they know what this is..." style="margin-bottom:1.5rem"></textarea>
      </div>

      <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:0.75rem">
        <button id="ct-share-another" class="btn gold">Invite another <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="ct-share-done" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer">Back to family</span>
      </div>
    </div>
  `
  app.appendChild(share)

  const shareCopy = share.querySelector('#ct-share-copy') as HTMLButtonElement
  const shareLinkText = share.querySelector('#ct-share-link-text') as HTMLSpanElement
  const shareNote = share.querySelector('#ct-share-note') as HTMLTextAreaElement

  shareCopy.addEventListener('click', async () => {
    const link = shareLinkText.textContent || ''
    try {
      await navigator.clipboard.writeText(link)
      shareCopy.textContent = 'Copied!'
      setTimeout(() => { shareCopy.textContent = 'Copy' }, 2000)
    } catch {
      const range = document.createRange()
      range.selectNodeContents(shareLinkText)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  share.querySelector('#ct-share-whatsapp')!.addEventListener('click', () => {
    const link = shareLinkText.textContent || ''
    const note = shareNote.value.trim()
    const text = note
      ? `${note}\n\n${link}`
      : `You're invited to leave a whisper for ${childName()}.\n\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  })

  share.querySelector('#ct-share-imessage')!.addEventListener('click', () => {
    const link = shareLinkText.textContent || ''
    const note = shareNote.value.trim()
    const body = note
      ? `${note}\n\n${link}`
      : `You're invited to leave a whisper for ${childName()}.\n\n${link}`
    window.open(`sms:&body=${encodeURIComponent(body)}`, '_self')
  })

  share.querySelector('#ct-share-back')!.addEventListener('click', () => navigate('v-ct-invite'))

  share.querySelector('#ct-share-another')!.addEventListener('click', () => {
    invNick.value = ''
    selectedRel = ''
    shareNote.value = ''
    invite.querySelectorAll('.format-tab[data-rel]').forEach(c => c.classList.remove('active'))
    invCreate.innerHTML = `Create invite link <span style="font-size:1.1em">${iconArrow()}</span>`
    invCreate.classList.add('off')
    invStatus.style.display = 'none'
    navigate('v-ct-invite')
  })
  share.querySelector('#ct-share-done')!.addEventListener('click', () => navigate('v-contributors'))

  // Load contributors
  let contributorsLoaded = false

  async function loadContributors(): Promise<void> {
    const { childId } = getState()
    if (!childId) {
      const list = view.querySelector('#ct-list') as HTMLDivElement
      list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-body)">No child selected.</div>`
      return
    }

    const list = view.querySelector('#ct-list') as HTMLDivElement
    const sb = getSupabase()
    const hadContent = contributorsLoaded

    let contributors: any[] | null = null
    let whisperCounts: any[] | null = null

    try {
      const [contribRes, countsRes] = await Promise.all([
        sb.from('contributors').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
        sb.from('whispers').select('contributor_id').eq('child_id', childId),
      ])

      if (contribRes.error) {
        console.error('Contributors query error:', contribRes.error)
        markFailure()
        if (!hadContent) {
          list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:#e85454;font-size:var(--text-body)">Could not load contributors. <span style="text-decoration:underline;cursor:pointer" id="ct-retry">Retry</span></div>`
          list.querySelector('#ct-retry')?.addEventListener('click', () => loadContributors())
        }
        return
      }
      contributors = contribRes.data
      whisperCounts = countsRes.data
    } catch (e) {
      console.error('Contributors exception:', e)
      markFailure()
      if (!hadContent) {
        const msg = (e as any)?.name === 'AbortError' ? 'Connection timed out.' : 'Could not load contributors.'
        list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:#e85454;font-size:var(--text-body)">${msg} <span style="text-decoration:underline;cursor:pointer" id="ct-retry">Retry</span></div>`
        list.querySelector('#ct-retry')?.addEventListener('click', () => loadContributors())
      }
      return
    }

    markSuccess()
    const countMap: Record<string, number> = {}
    if (whisperCounts) {
      whisperCounts.forEach((w: any) => {
        if (w.contributor_id) {
          countMap[w.contributor_id] = (countMap[w.contributor_id] || 0) + 1
        }
      })
    }

    const rows = (contributors || []) as ContributorRow[]

    // Add keeper as first entry
    const keeperWhispers = whisperCounts
      ? whisperCounts.filter((w: any) => !w.contributor_id).length
      : 0

    let html = `
      <div class="card" style="animation:rise 0.3s both">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <div class="avatar">${(getState().keeper || '?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-body);font-weight:500;color:var(--white)">${escHtml(keeperName())}</div>
            <div style="font-size:var(--text-meta);color:var(--dim)">${escHtml(getState().relationship || 'Keeper')}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:var(--text-body);font-weight:500;color:var(--gold-hi)">${keeperWhispers}</div>
            <div style="font-size:var(--text-meta);color:var(--dim)">whispers</div>
          </div>
        </div>
      </div>
    `

    if (rows.length === 0) {
      html += `
        <div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-caption)">
          No contributors yet. Invite family members to leave whispers.
        </div>
      `
    } else {
      html += rows.map((c, i) => {
        const count = countMap[c.id] || 0
        const initials = c.nickname[0]?.toUpperCase() || '?'
        const link = `${window.location.origin}?token=${c.invite_token}`

        return `
          <div class="card" style="animation:rise 0.3s ${0.05 * (i + 1)}s both">
            <div style="display:flex;align-items:center;gap:0.6rem">
              <div class="avatar">${initials}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--text-body);font-weight:500;color:var(--white)">${escHtml(c.nickname)}</div>
                <div style="font-size:var(--text-meta);color:var(--dim)">${escHtml(c.relationship || '')}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:var(--text-body);font-weight:500;color:var(--gold-hi)">${count}</div>
                <div style="font-size:var(--text-meta);color:var(--dim)">whispers</div>
              </div>
            </div>
            <div style="margin-top:0.6rem;display:flex;gap:0.5rem">
              <button class="pill" data-copy-link="${escHtml(link)}" style="font-size:var(--text-meta)">Copy link</button>
              ${typeof navigator.share === 'function' ? `<button class="pill" data-share-link="${escHtml(link)}" data-share-nick="${escHtml(c.nickname)}" style="font-size:var(--text-meta)">Share</button>` : ''}
            </div>
          </div>
        `
      }).join('')
    }

    list.innerHTML = html
    contributorsLoaded = true

    // Wire copy/share buttons
    list.querySelectorAll('[data-copy-link]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const link = (btn as HTMLElement).dataset.copyLink!
        try {
          await navigator.clipboard.writeText(link)
          btn.textContent = 'Copied!'
          setTimeout(() => { btn.textContent = 'Copy link' }, 2000)
        } catch { /* silent */ }
      })
    })

    list.querySelectorAll('[data-share-link]').forEach(btn => {
      btn.addEventListener('click', () => {
        const link = (btn as HTMLElement).dataset.shareLink!
        const nick = (btn as HTMLElement).dataset.shareNick || ''
        navigator.share({
          title: `Leave a whisper for ${childName()}`,
          text: `${nick}, you're invited to leave a whisper for ${childName()}.`,
          url: link,
        }).catch(() => {})
      })
    })
  }

  onRouteChange((_from, to) => {
    if (to === 'v-contributors') {
      const sub = view.querySelector('#ct-subtitle')
      if (sub) sub.textContent = `People who love ${childName()}`
      loadContributors()
    }
    if (to === 'v-ct-invite') {
      const headline = invite.querySelector('#ct-inv-headline')
      if (headline) headline.textContent = `Who else loves ${childName()}?`
      const nameLabel = invite.querySelector('#ct-inv-name-label')
      if (nameLabel) nameLabel.textContent = `What does ${childName()} call them?`
    }
  })
}
