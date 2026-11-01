// Gauntlet: compila, pasa todas las pruebas y genera gauntlet/informe.html con el listón por requisito.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

mkdirSync('gauntlet', { recursive: true })
const paso = (cmd) => { try { execSync(cmd, { stdio: 'inherit' }); return true } catch { return false } }
const leer = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null)

const build = paso('npm run build')
paso('npx vitest run --reporter=default --reporter=json --outputFile=gauntlet/unit.json')
paso('npx playwright test')

const casos = []
for (const f of leer('gauntlet/unit.json')?.testResults || [])
  for (const t of f.assertionResults) casos.push({ capa: f.name.includes('arbitro') || t.ancestorTitles.some((a) => a.includes('árbitro')) ? 'Árbitro' : 'Lógica', nombre: t.title, ok: t.status === 'passed', saltada: t.status === 'skipped' || t.status === 'pending' })
const recorrer = (s, cb) => { s.specs?.forEach((sp) => sp.tests.forEach((t) => cb(sp, t))); s.suites?.forEach((x) => recorrer(x, cb)) }
for (const s of leer('gauntlet/e2e.json')?.suites || [])
  recorrer(s, (sp, t) => casos.push({ capa: `Pantalla · ${t.projectName}`, nombre: sp.title, ok: t.status === 'expected', saltada: t.status === 'skipped' }))

const spec = readFileSync('docs/ESPECIFICACIONES.md', 'utf8')
const reqs = [...spec.matchAll(/^- \*\*([A-Z]+-\d+)\*\* (.+)$/gm)].map(([, id, txt]) => ({ id, txt: txt.replace(/\*\*/g, '') }))
const por = Object.fromEntries(reqs.map((r) => [r.id, []]))
for (const c of casos) for (const [, id] of c.nombre.matchAll(/\[([A-Z]+-\d+)\]/g)) (por[id] ||= []).push(c)

const corridos = casos.filter((c) => !c.saltada)
const fallan = corridos.filter((c) => !c.ok)
const sinPrueba = reqs.filter((r) => !por[r.id].length)
const aprobado = build && corridos.length > 0 && !fallan.length && !sinPrueba.length

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
const fila = (r) => {
  const cs = por[r.id], f = cs.filter((c) => !c.saltada && !c.ok).length
  const est = !cs.length ? ['Sin prueba', 'gris'] : f ? [`${f} fallo(s)`, 'rojo'] : ['Pasa', 'verde']
  return `<tr><td><b>${r.id}</b></td><td>${esc(r.txt)}</td><td>${cs.filter((c) => !c.saltada).length}</td><td><span class="${est[1]}">${est[0]}</span></td></tr>`
}
writeFileSync('gauntlet/informe.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gauntlet · Horarios</title>
<style>body{font:15px system-ui;margin:0;background:#faf7f9;color:#2b1a24}main{max-width:980px;margin:auto;padding:24px}h1{color:#6d1f4b}
.listón{padding:18px 22px;border-radius:18px;color:#fff;font-size:20px;font-weight:600;background:${aprobado ? '#15803d' : '#b91c1c'}}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.kpi div{background:#fff;border-radius:14px;padding:14px;box-shadow:0 1px 4px #0001}.kpi b{font-size:26px;display:block}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px #0001}td,th{padding:8px 10px;border-top:1px solid #f1e6ec;text-align:left;vertical-align:top}th{background:#f6eaf1;font-size:12px;text-transform:uppercase}
.verde,.rojo,.gris{padding:2px 8px;border-radius:8px;font-size:13px;white-space:nowrap}.verde{background:#dcfce7;color:#166534}.rojo{background:#fee2e2;color:#991b1b}.gris{background:#eee;color:#555}</style>
<main><h1>Gauntlet · App de horarios y fichajes</h1><p>${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
<div class="listón">${aprobado ? '✔ Listón superado: se puede publicar' : '✘ No pasa el listón: no publicar'}</div>
<div class="kpi"><div><b>${build ? 'Sí' : 'No'}</b>Compila</div><div><b>${corridos.length - fallan.length}/${corridos.length}</b>Pruebas que pasan</div><div><b>${reqs.length - sinPrueba.length}/${reqs.length}</b>Requisitos con prueba</div><div><b>${casos.filter((c) => c.capa === 'Árbitro').length}</b>Pruebas del árbitro</div></div>
<h2>Requisitos</h2><table><tr><th>Código</th><th>Qué se exige</th><th>Pruebas</th><th>Estado</th></tr>${reqs.map(fila).join('')}</table>
${fallan.length ? `<h2>Fallos</h2><ul>${fallan.map((c) => `<li>${esc(c.capa)} · ${esc(c.nombre)}</li>`).join('')}</ul>` : ''}
<h2>Todas las pruebas</h2><table><tr><th>Capa</th><th>Prueba</th><th>Resultado</th></tr>${casos.map((c) => `<tr><td>${esc(c.capa)}</td><td>${esc(c.nombre)}</td><td><span class="${c.saltada ? 'gris' : c.ok ? 'verde' : 'rojo'}">${c.saltada ? 'No aplica' : c.ok ? 'Pasa' : 'Falla'}</span></td></tr>`).join('')}</table></main>`)

console.log(`\nGauntlet: compila=${build} · pruebas ${corridos.length - fallan.length}/${corridos.length} · requisitos sin prueba: ${sinPrueba.map((r) => r.id).join(', ') || 'ninguno'}`)
console.log(aprobado ? 'LISTÓN SUPERADO' : 'NO PASA EL LISTÓN')
process.exit(aprobado ? 0 : 1)
