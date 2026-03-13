type RouteChangeHandler = (from: string | null, to: string) => void

let currentRoute: string | null = null
const handlers: RouteChangeHandler[] = []

export function navigate(viewId: string): void {
  const from = currentRoute

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))

  // Show target
  const target = document.getElementById(viewId)
  if (target) {
    target.classList.add('active')
    target.scrollTop = 0
  } else {
    console.error(`[Router] View not found: ${viewId}`)
    return
  }

  currentRoute = viewId

  // Notify handlers
  handlers.forEach(fn => fn(from, viewId))
}

export function onRouteChange(fn: RouteChangeHandler): void {
  handlers.push(fn)
}

export function getCurrentRoute(): string | null {
  return currentRoute
}

// Block navigation for specific modes (e.g. giver mode)
let navigationGuard: ((to: string) => boolean) | null = null

export function setNavigationGuard(fn: ((to: string) => boolean) | null): void {
  navigationGuard = fn
}

// Wrapper that respects guards
export function go(viewId: string): void {
  if (navigationGuard && !navigationGuard(viewId)) {
    console.log(`[Router] Blocked navigation to ${viewId}`)
    return
  }
  navigate(viewId)
}
