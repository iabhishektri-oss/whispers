/**
 * Native-feeling pull-to-refresh for scrollable views.
 *
 * Works with both touch (mobile) and pointer/mouse (desktop) events.
 * Attach to any scrollable element — when the user pulls down past
 * a threshold and releases, the onRefresh callback fires.
 */

const THRESHOLD = 64   // px to pull before triggering
const MAX_PULL = 100   // visual cap
const RESIST = 0.4     // rubber-band resistance factor

export function initPullToRefresh(
  scrollEl: HTMLElement,
  onRefresh: () => Promise<void> | void,
): void {
  const indicator = document.createElement('div')
  indicator.style.cssText =
    'display:flex;align-items:center;justify-content:center;' +
    'height:0;overflow:visible;pointer-events:none;transition:none;'
  indicator.innerHTML =
    '<div style="width:22px;height:22px;border-radius:50%;border:2px solid rgba(200,144,12,0.25);' +
    'border-top-color:var(--gold);opacity:0;transition:opacity 0.15s;' +
    'transform-origin:center" data-ptr-spinner></div>'

  scrollEl.insertBefore(indicator, scrollEl.firstChild)
  const spinner = indicator.querySelector('[data-ptr-spinner]') as HTMLDivElement

  let startY = 0
  let pulling = false
  let refreshing = false

  function onStart(clientY: number): void {
    if (refreshing) return
    if (scrollEl.scrollTop > 5) return
    startY = clientY
    pulling = true
    indicator.style.transition = 'none'
    spinner.style.transition = 'none'
  }

  function onMove(clientY: number, cancel: () => void): void {
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

    if (scrollEl.scrollTop <= 0 && dy > 0) cancel()
  }

  async function onEnd(): Promise<void> {
    if (!pulling || refreshing) return
    pulling = false

    const h = parseFloat(indicator.style.height) || 0

    if (h >= THRESHOLD) {
      refreshing = true
      indicator.style.transition = 'height 0.2s ease'
      indicator.style.height = '44px'
      spinner.style.opacity = '1'
      spinner.style.animation = 'ptr-spin 0.6s linear infinite'

      try {
        await onRefresh()
      } finally {
        spinner.style.animation = ''
        indicator.style.transition = 'height 0.3s ease'
        indicator.style.height = '0'
        spinner.style.transition = 'opacity 0.2s'
        spinner.style.opacity = '0'
        refreshing = false
      }
    } else {
      indicator.style.transition = 'height 0.25s ease'
      indicator.style.height = '0'
      spinner.style.transition = 'opacity 0.15s'
      spinner.style.opacity = '0'
    }
  }

  // --- Touch events (mobile) ---
  scrollEl.addEventListener('touchstart', (e) => {
    onStart(e.touches[0].clientY)
  }, { passive: true })

  scrollEl.addEventListener('touchmove', (e) => {
    onMove(e.touches[0].clientY, () => e.preventDefault())
  }, { passive: false })

  scrollEl.addEventListener('touchend', () => { onEnd() }, { passive: true })

  // --- Pointer events (desktop / mouse / stylus) ---
  let pointerDown = false

  scrollEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return  // handled by touch events
    pointerDown = true
    onStart(e.clientY)
  })

  scrollEl.addEventListener('pointermove', (e) => {
    if (!pointerDown || e.pointerType === 'touch') return
    onMove(e.clientY, () => e.preventDefault())
  })

  const pointerEnd = (e: PointerEvent) => {
    if (!pointerDown || e.pointerType === 'touch') return
    pointerDown = false
    onEnd()
  }
  scrollEl.addEventListener('pointerup', pointerEnd)
  scrollEl.addEventListener('pointercancel', pointerEnd)
}
