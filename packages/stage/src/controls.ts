import type { SketchMeta } from './meta.ts'

export type ControlsOptions = {
  meta: SketchMeta
  soundAvailable: boolean
  onReset: () => void
  onSound: (on: boolean) => void | Promise<void>
}

export type Controls = { root: HTMLElement; destroy(): void }

function button(label: string, className: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = `uxs-button ${className}`
  b.textContent = label
  return b
}

/** Reset, Sound (starts off) and Notes, in a corner of the stage. */
export function mountControls(container: HTMLElement, o: ControlsOptions): Controls {
  const root = document.createElement('div')
  root.className = 'uxs-controls'

  const reset = button('Reset', 'uxs-reset')
  reset.addEventListener('click', () => o.onReset())

  const sound = button('Sound', 'uxs-sound')
  sound.setAttribute('aria-pressed', 'false')
  sound.hidden = !o.soundAvailable
  sound.addEventListener('click', async () => {
    const on = sound.getAttribute('aria-pressed') !== 'true'
    sound.setAttribute('aria-pressed', String(on))
    await o.onSound(on)
  })

  const notes = button('Notes', 'uxs-notes')
  const panelId = 'uxs-notes-panel'
  notes.setAttribute('aria-expanded', 'false')
  notes.setAttribute('aria-controls', panelId)

  const panel = document.createElement('div')
  panel.id = panelId
  panel.className = 'uxs-panel'
  panel.hidden = true
  const { meta } = o
  const rows: Array<[string, string]> = [
    ['Component', meta.component],
    ['Question', meta.question],
    ['What it turned up', meta.note],
    ['Tools', meta.tools.join(', ')],
    ['Date', meta.date],
  ]
  const heading = document.createElement('p')
  heading.className = 'uxs-panel-title'
  heading.textContent = `${meta.title} · ${String(meta.number).padStart(3, '0')}`
  const list = document.createElement('dl')
  for (const [k, v] of rows) {
    const dt = document.createElement('dt')
    dt.textContent = k
    const dd = document.createElement('dd')
    dd.textContent = v
    list.append(dt, dd)
  }
  panel.append(heading, list)

  const setOpen = (open: boolean) => {
    panel.hidden = !open
    notes.setAttribute('aria-expanded', String(open))
  }
  notes.addEventListener('click', () => setOpen(panel.hidden !== false))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false)
      notes.focus()
    }
  }
  document.addEventListener('keydown', onKey)

  root.append(reset, sound, notes)
  container.append(root, panel)
  return {
    root,
    destroy() {
      document.removeEventListener('keydown', onKey)
      root.remove()
      panel.remove()
    },
  }
}
