import type { SketchMeta } from './meta.ts'

export type FloorLines = { heading: string; date: string; question: string; tools: string }

export function floorLines(meta: SketchMeta): FloorLines {
  return {
    heading: `${meta.title} · ${String(meta.number).padStart(3, '0')}`,
    date: meta.date,
    question: meta.question,
    tools: meta.tools.join(' · '),
  }
}
