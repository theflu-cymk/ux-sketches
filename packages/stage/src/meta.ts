export type FloorTextMode = 'print' | 'letters' | 'ink'
export type LabCategory = '3D' | 'MOTION' | 'GENERATIVE' | 'AI' | 'INTERACTION' | 'WEB'

export type SketchMeta = {
  number: number
  slug: string
  title: string
  date: string
  component: string
  question: string
  note: string
  tools: string[]
  floorText: FloorTextMode
  categories: LabCategory[]
}

export const FLOOR_TEXT_MODES: readonly FloorTextMode[] = ['print', 'letters', 'ink']
export const LAB_CATEGORIES: readonly LabCategory[] = ['3D', 'MOTION', 'GENERATIVE', 'AI', 'INTERACTION', 'WEB']

const SLUG = /^(\d{3})-[a-z0-9]+(-[a-z0-9]+)*$/
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function isRealDate(value: string): boolean {
  const m = DATE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

const text = (v: unknown, max?: number) => typeof v === 'string' && v.trim() !== '' && (max === undefined || v.length <= max)

export function validateSketchMeta(input: unknown): { ok: true; meta: SketchMeta } | { ok: false; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, errors: ['sketch.json must be an object'] }
  const m = input as Record<string, unknown>
  const errors: string[] = []

  const number = m.number
  if (!Number.isInteger(number) || (number as number) < 1 || (number as number) > 999) errors.push('number must be an integer from 1 to 999')
  const slugMatch = typeof m.slug === 'string' ? SLUG.exec(m.slug) : null
  if (!slugMatch) errors.push('slug must look like 001-kebab-name')
  else if (Number.isInteger(number) && slugMatch[1] !== String(number).padStart(3, '0')) errors.push('slug must start with the zero-padded number')
  if (!text(m.title, 40)) errors.push('title is required, at most 40 characters')
  if (typeof m.date !== 'string' || !isRealDate(m.date)) errors.push('date must be a real YYYY-MM-DD date')
  if (!text(m.component)) errors.push('component is required')
  if (!text(m.question, 90)) errors.push('question is required, at most 90 characters')
  if (!text(m.note)) errors.push('note is required')
  if (!Array.isArray(m.tools) || m.tools.length === 0 || !m.tools.every((t) => text(t))) errors.push('tools must be a non-empty list of names')
  if (!FLOOR_TEXT_MODES.includes(m.floorText as FloorTextMode)) errors.push(`floorText must be one of ${FLOOR_TEXT_MODES.join(', ')}`)
  if (!Array.isArray(m.categories) || m.categories.length === 0 || !m.categories.every((c) => LAB_CATEGORIES.includes(c as LabCategory))) {
    errors.push(`categories must be a non-empty list from ${LAB_CATEGORIES.join(', ')}`)
  }

  return errors.length ? { ok: false, errors } : { ok: true, meta: input as SketchMeta }
}
