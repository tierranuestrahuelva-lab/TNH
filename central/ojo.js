// Botón de ojo para ver u ocultar la contraseña mientras se escribe. Sirve para cualquier app (no toca el formulario).
(() => {
  if (window.__tnOjo) return; window.__tnOjo = 1
  const svg = (x) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${x ? '<path d="M3 3l18 18"/>' : ''}</svg>`
  const css = document.createElement('style')
  css.textContent = '.tn-ojo{position:fixed;z-index:2147483000;border:0;background:transparent;padding:4px;margin:0;cursor:pointer;color:#666;line-height:0;border-radius:6px}.tn-ojo:hover{color:#222}'
  document.head.appendChild(css)
  const vistos = new Map()
  let bucle = 0
  const colocar = () => {
    bucle = 0
    for (const [i, b] of vistos) {
      if (!i.isConnected) { b.remove(); vistos.delete(i); continue }
      const r = i.getBoundingClientRect()
      const ve = r.width > 40 && r.height > 10 && getComputedStyle(i).visibility !== 'hidden'
      b.style.display = ve ? '' : 'none'
      if (ve) { b.style.left = (r.right - 34) + 'px'; b.style.top = (r.top + r.height / 2 - 14) + 'px' }
    }
    if (vistos.size) bucle = requestAnimationFrame(colocar)
  }
  const poner = (i) => {
    if (vistos.has(i)) return
    i.style.paddingRight = '40px'
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'tn-ojo'; b.tabIndex = -1
    const pintar = () => { const oculta = i.type === 'password'; b.innerHTML = svg(!oculta); b.title = b.ariaLabel = oculta ? 'Mostrar contraseña' : 'Ocultar contraseña' }
    b.addEventListener('mousedown', (e) => e.preventDefault())
    b.addEventListener('click', () => { i.type = i.type === 'password' ? 'text' : 'password'; pintar(); i.focus() })
    pintar(); document.body.appendChild(b); vistos.set(i, b)
    if (!bucle) bucle = requestAnimationFrame(colocar)
  }
  const buscar = () => document.querySelectorAll('input[type=password]').forEach(poner)
  const arrancar = () => { buscar(); new MutationObserver(buscar).observe(document.body, { childList: true, subtree: true }) }
  document.body ? arrancar() : document.addEventListener('DOMContentLoaded', arrancar)
})()
