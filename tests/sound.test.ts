import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSound } from '../packages/stage/src/sound.ts'

function fakeAudio() {
  const made: string[] = []
  let contexts = 0
  const node = (kind: string) => {
    made.push(kind)
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} })
    return {
      connect: (n: unknown) => n,
      start() {},
      stop() {},
      frequency: param(),
      gain: param(),
      Q: param(),
      type: '',
      buffer: null as unknown,
    }
  }
  const factory = () => {
    contexts++
    return {
      currentTime: 0,
      sampleRate: 48000,
      destination: {},
      state: 'running',
      resume: async () => {},
      suspend: async () => {},
      createOscillator: () => node('oscillator'),
      createGain: () => node('gain'),
      createBiquadFilter: () => node('filter'),
      createBufferSource: () => node('source'),
      createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    } as unknown as AudioContext
  }
  return { factory, made, contexts: () => contexts }
}

test('sound starts disabled', () => {
  assert.equal(createSound(fakeAudio().factory).enabled, false)
})

test('play calls do nothing while disabled', () => {
  const f = fakeAudio()
  const s = createSound(f.factory)
  s.click(); s.thunk(); s.tick(); s.tone(440, 0.1)
  assert.deepEqual(f.made, [])
  assert.equal(f.contexts(), 0)
})

test('setEnabled(true) creates the context once', async () => {
  const f = fakeAudio()
  const s = createSound(f.factory)
  await s.setEnabled(true)
  await s.setEnabled(true)
  assert.equal(f.contexts(), 1)
  s.click()
  assert.ok(f.made.length > 0)
})

test('setEnabled(false) then play does nothing', async () => {
  const f = fakeAudio()
  const s = createSound(f.factory)
  await s.setEnabled(true)
  await s.setEnabled(false)
  const before = f.made.length
  s.thunk()
  assert.equal(f.made.length, before)
  assert.equal(s.enabled, false)
})
