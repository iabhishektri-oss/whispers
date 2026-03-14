// All icons are SVG line icons. Never emojis.
// Each returns an SVG string. Pass size and color as needed.

export function iconMic(size = 18, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" stroke="${color}" stroke-width="1.5"/><path d="M5 10a7 7 0 0014 0" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`
}

export function iconWrite(size = 18, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export function iconCamera(size = 18, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="${color}" stroke-width="1.5"/><circle cx="12" cy="13" r="4" stroke="${color}" stroke-width="1.5"/></svg>`
}

export function iconHome(size = 20, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export function iconFamily(size = 20, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="${color}" stroke-width="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`
}

export function iconCheck(size = 24, color = 'var(--gold-hi)'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export function iconBack(): string {
  return `&#8592;`
}

export function iconArrow(): string {
  return `&#8594;`
}

export function iconSeal(size = 11, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M5 3h14M5 21h14M7 3v3a5 5 0 0010 0V3M7 21v-3a5 5 0 0110 0v3" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

export function iconLock(size = 18, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="${color}" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`
}

export function iconPlus(size = 18, color = 'currentColor'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`
}
