/**
 * Native-feeling pull-to-refresh for scrollable views.
 *
 * Works with both touch (mobile) and pointer/mouse (desktop) events.
 */

const THRESHOLD = 64
const MAX_PULL = 100
const RESIST = 0.4
const REFRESH_TIMEOUT = 8_000  // safety: collapse after 8s no matter what

export function initPullToRefresh(
  scrollEl: HTMLElement,
  onRefresh: () => Promise<void> | void,
): void {
  const indicator = document.createElement('div')
  indicator.className = 'ptr-indicator'
  indicator.innerHTML = '<div class="ptr-spinner"></div>'

  scrollEl.insertBefore(indicator, scrollEl.firstChild)
  const spinner = indicator.querySelector('.ptr-spinner') as HTMLDivElement

  let startY = 0
  let pulling = false
  let refreshing = false

  function collapse(): void {
    pulling = false
    refreshing = false
    spinner.classList.remove('ptr-spinning')
    // Clear inline transform so CSS class defaults take over
    spinner.style.transform = ''
    indicator.style.transition = 'height 0.25s ease'
    indicator.style.height = '0'
    spinner.style.opacity = '0'
  }

  function onStart(clientY: number): void {
    if (refreshing) return
    if (scrollEl.scrollTop > 5) return
    startY = clientY
    pulling = true
    indicator.style.transition = 'none'
  }

  function onMove(clientY: number, prevent: () => void): void {
    if (!pulling || refreshing) return

    const dy = (clientY - startY) * RESIST
    if (dy <= 0) {
      indicator.style.height = '0'
      spinner.style.opacity = '0'
      return
    }

    const clamped = Math.min(dy, MAX_PULL)
    const progress = Math.min(clamped / THRESHOLD, 1)

    indicator.style.height = `${clamped}px`
    spinner.style.opacity = String(progress)
    spinner.style.transform = `rotate(${progress * 270}deg) scale(${0.6 + progress * 0.4})`

    if (scrollEl.scrollTop <= 0 && dy > 0) prevent()
  }

  function onEnd(): void {
    if (!pulling || refreshing) return
    pulling = false

    const h = parseFloat(indicator.style.height) || 0

    if (h >= THRESHOLD) {
      refreshing = true
      indicator.style.transition = 'height 0.2s ease'
      indicator.style.height = '44px'
      spinner.style.opacity = '1'
      // Clear inline transform BEFORE adding animation class
      // so the animation's from/to keyframes aren't fighting inline styles
      spinner.style.transform = ''
      spinner.classList.add('ptr-spinning')

      // Safety timeout — always collapse even if onRefresh hangs
      const safetyTimer = setTimeout(collapse, REFRESH_TIMEOUT)

      Promise.resolve()
        .then(() => onRefresh())
        .catch(() => {})
        .finally(() => {
          clearTimeout(safetyTimer)
          collapse()
        })
    } else {
      collapse()
    }
  }

  // --- Touch events (mobile) ---
  scrollEl.addEventListener('touchstart', (e) => {
    onStart(e.touches[0].clientY)
  }, { passive: true })

  scrollEl.addEventListener('touchmove', (e) => {
    onMove(e.touches[0].clientY, () => e.preventDefault())
  }, { passive: false })

  scrollEl.addEventListener('touchend', onEnd, { passive: true })
  scrollEl.addEventListener('touchcancel', onEnd, { passive: true })

  // --- Pointer events (desktop / mouse / stylus) ---
  let pointerDown = false

  scrollEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return
    pointerDown = true
    onStart(e.clientY)
  })

  scrollEl.addEventListener('pointermove', (e) => {
    if (!pointerDown || e.pointerType === 'touch') return
    onMove(e.clientY, () => e.preventDefault())
  })

  const ptrEnd = (e: PointerEvent) => {
    if (!pointerDown || e.pointerType === 'touch') return
    pointerDown = false
    onEnd()
  }
  scrollEl.addEventListener('pointerup', ptrEnd)
  scrollEl.addEventListener('pointercancel', ptrEnd)
}
