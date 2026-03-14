import { navigate, onRouteChange } from '@/lib/router'
import { getState, childName, keeperName } from '@/lib/state'
import { getSupabase } from '@/lib/supabase'
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
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <button class="back" style="position:absolute;top:1.25rem;left:1.5rem" id="ct-inv-back">${iconBack()}</button>
      <div class="headline" style="margin-bottom:0.5rem">Invite a family member</div>
      <p style="color:var(--dim);font-size:var(--text-body);margin-bottom:2rem">They'll get a link to leave a whisper for <span id="ct-inv-name"></span>. No account needed.</p>
      <input id="ct-inv-nick" class="input" type="text" placeholder="Their name (e.g. Grandma)" style="text-align:center;margin-bottom:0.75rem" maxlength="40" autocomplete="off" />
      <input id="ct-inv-rel" class="input" type="text" placeholder="Relationship (e.g. Grandmother)" style="text-align:center;margin-bottom:1.5rem" maxlength="40" autocomplete="off" />
      <button id="ct-inv-create" class="btn off">Create invite link <span style="font-size:1.1em">${iconArrow()}</span></button>
      <div id="ct-inv-status" style="font-size:var(--text-caption);color:var(--dim);display:none;margin-top:0.5rem"></div>
    </div>
  `
  app.appendChild(invite)

  const invNick = invite.querySelector('#ct-inv-nick') as HTMLInputElement
  const invRel = invite.querySelector('#ct-inv-rel') as HTMLInputElement
  const invCreate = invite.querySelector('#ct-inv-create') as HTMLButtonElement
  const invStatus = invite.querySelector('#ct-inv-status') as HTMLDivElement

  invNick.addEventListener('input', () => {
    invCreate.classList.toggle('off', invNick.value.trim().length === 0)
  })

  invite.querySelector('#ct-inv-back')!.addEventListener('click', () => navigate('v-contributors'))

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
    <div class="shell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;text-align:center;padding-top:2rem;padding-bottom:2rem">
      <div style="animation:rise 0.6s 0.1s both;display:flex;flex-direction:column;align-items:center;gap:1.25rem;width:100%">
        <div style="color:var(--gold-hi)">${iconCheck(48)}</div>
        <div class="headline" style="margin-bottom:0.25rem">Invite created</div>
        <p style="color:var(--body);font-size:var(--text-body);line-height:var(--lh-body)">Share this link. They can leave a whisper in under two minutes.</p>
        <div class="card" style="width:100%;word-break:break-all;font-size:var(--text-caption);color:var(--gold-hi);text-align:left;cursor:pointer" id="ct-share-link-card">
          <span id="ct-share-link-text"></span>
        </div>
        <button id="ct-share-copy" class="btn" style="margin-top:0.5rem">Copy link</button>
        <button id="ct-share-native" class="btn" style="display:none">Share</button>
      </div>
      <div style="position:absolute;bottom:2.75rem;left:1.5rem;right:1.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem">
        <button id="ct-share-another" class="btn">Invite another <span style="font-size:1.1em">${iconArrow()}</span></button>
        <span id="ct-share-done" style="font-size:var(--text-caption);color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Back to family</span>
      </div>
    </div>
  `
  app.appendChild(share)

  const shareCopy = share.querySelector('#ct-share-copy') as HTMLButtonElement
  const shareNative = share.querySelector('#ct-share-native') as HTMLButtonElement
  const shareLinkText = share.querySelector('#ct-share-link-text') as HTMLSpanElement

  shareCopy.addEventListener('click', async () => {
    const link = shareLinkText.textContent || ''
    try {
      await navigator.clipboard.writeText(link)
      shareCopy.innerHTML = `Copied ${iconCheck(16)}`
      setTimeout(() => { shareCopy.innerHTML = 'Copy link' }, 2000)
    } catch {
      const range = document.createRange()
      range.selectNodeContents(shareLinkText)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  if (typeof navigator.share === 'function') {
    shareNative.style.display = ''
    shareNative.addEventListener('click', () => {
      const link = shareLinkText.textContent || ''
      navigator.share({
        title: `Leave a whisper for ${childName()}`,
        text: `You're invited to leave a whisper for ${childName()}.`,
        url: link,
      }).catch(() => {})
    })
  }

  share.querySelector('#ct-share-another')!.addEventListener('click', () => {
    invNick.value = ''
    invRel.value = ''
    invCreate.innerHTML = `Create invite link <span style="font-size:1.1em">${iconArrow()}</span>`
    invCreate.classList.add('off')
    invStatus.style.display = 'none'
    navigate('v-ct-invite')
  })
  share.querySelector('#ct-share-done')!.addEventListener('click', () => navigate('v-contributors'))

  // Load contributors
  async function loadContributors(): Promise<void> {
    const { childId } = getState()
    if (!childId) {
      const list = view.querySelector('#ct-list') as HTMLDivElement
      list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:var(--dim);font-size:var(--text-body)">No child selected.</div>`
      return
    }

    const list = view.querySelector('#ct-list') as HTMLDivElement
    const sb = getSupabase()

    let contributors: any[] | null = null
    let whisperCounts: any[] | null = null

    try {
      // Get contributors
      const { data, error } = await sb
        .from('contributors')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Contributors query error:', error)
        list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:#e85454;font-size:var(--text-body)">Could not load contributors.</div>`
        return
      }
      contributors = data
    } catch (e) {
      console.error('Contributors exception:', e)
      list.innerHTML = `<div style="text-align:center;padding:1.5rem 0;color:#e85454;font-size:var(--text-body)">Could not load contributors.</div>`
      return
    }

    try {
      // Get whisper counts per contributor (include keeper whispers where contributor_id is null)
      const { data } = await sb
        .from('whispers')
        .select('contributor_id')
        .eq('child_id', childId)
      whisperCounts = data
    } catch (e) {
      console.error('Whisper counts exception:', e)
      // Continue without counts
    }

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
      const nameEl = invite.querySelector('#ct-inv-name')
      if (nameEl) nameEl.textContent = childName()
    }
  })
}
