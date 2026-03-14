/** On-screen debug log for mobile debugging (no desktop DevTools needed) */
let panel: HTMLDivElement | null = null
const logs: string[] = []

function ensurePanel(): HTMLDivElement {
  if (panel) return panel
  panel = document.createElement('div')
  panel.id = 'debug-panel'
  panel.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;max-height:35vh;overflow-y:auto;
    background:rgba(0,0,0,0.92);color:#0f0;font-size:10px;font-family:monospace;
    padding:6px 8px;z-index:99999;white-space:pre-wrap;word-break:break-all;
    border-top:1px solid #333;
  `
  document.body.appendChild(panel)
  return panel
}

export function dbg(msg: string): void {
  const t = new Date()
  const ts = `${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}.${t.getMilliseconds().toString().padStart(3,'0')}`
  const line = `[${ts}] ${msg}`
  logs.push(line)
  if (logs.length > 50) logs.shift()
  console.log(line)
  const p = ensurePanel()
  p.textContent = logs.join('\n')
  p.scrollTop = p.scrollHeight
}
