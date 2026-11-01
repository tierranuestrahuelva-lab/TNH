import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(__dirname, '../..')
const sql = readdirSync(join(raiz, 'supabase')).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(join(raiz, 'supabase', f), 'utf8')).join('\n')
const columnas = new Map<string, Set<string>>()
const col = (t: string) => columnas.get(t) || columnas.set(t, new Set()).get(t)!
for (const m of sql.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\);/g)) {
  for (const c of m[2].matchAll(/(?:^|,)\s*(\w+)\s+(?:text|numeric|int|integer|bigint|bigserial|boolean|timestamptz|date|jsonb|double precision)\b/gm)) col(m[1]).add(c[1])
}
for (const m of sql.matchAll(/alter table (\w+)\s+((?:add column[^;]*?)+);/g)) for (const c of m[2].matchAll(/add column if not exists (\w+)/g)) col(m[1]).add(c[1])

const tipos = readFileSync(join(raiz, 'src/lib/types.ts'), 'utf8')
const campos = (i: string) => [...tipos.match(new RegExp(`interface ${i} \\{([\\s\\S]*?)\\n\\}`))![1].matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1])

describe('contrato con la base de datos', () => {
  it.each([['Empleado', 'hor_empleados'], ['Turno', 'hor_turnos'], ['Fichaje', 'hor_fichajes'], ['Solicitud', 'hor_solicitudes']])('[DAT-01] todos los campos de %s existen en %s', (i, t) => {
    const faltan = campos(i).filter((c) => !col(t).has(c))
    expect(faltan).toEqual([])
  })
  it('[DAT-01] los campos extra que se escriben (updated_at) existen', () => {
    expect(col('hor_solicitudes').has('updated_at')).toBe(true)
    expect(col('hor_config').has('updated_at')).toBe(true)
  })
})
