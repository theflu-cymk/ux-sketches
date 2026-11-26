export type Play = { pitch?: number; gain?: number }

export type Sound = {
  enabled: boolean
  setEnabled(on: boolean): Promise<void>
  click(o?: Play): void
  thunk(o?: Play): void
  tick(o?: Play): void
  tone(freq: number, seconds: number, o?: { gain?: number }): void
}

/**
 * Small synthesised UI sounds on the Web Audio API. Muted until setEnabled(true), which is called from the
 * Sound button (a user gesture, so the browser lets the context start).
 */
export function createSound(factory: () => AudioContext = () => new AudioContext()): Sound {
  let ctx: AudioContext | null = null
  let noise: AudioBuffer | null = null

  const env = (gain: GainNode, at: number, peak: number, attack: number, release: number) => {
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(peak, at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
  }

  const osc = (type: OscillatorType, freq: number, peak: number, attack: number, release: number, endFreq?: number) => {
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + release)
    env(g, t, peak, attack, release)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + attack + release + 0.02)
  }

  const sound: Sound = {
    enabled: false,
    async setEnabled(on) {
      sound.enabled = on
      if (on) {
        ctx ??= factory()
        await ctx.resume()
      } else if (ctx) {
        await ctx.suspend()
      }
    },
    click(o = {}) {
      if (!sound.enabled || !ctx) return
      const t = ctx.currentTime
      if (!noise) {
        noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.01), ctx.sampleRate)
        const data = noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
      }
      const src = ctx.createBufferSource()
      src.buffer = noise
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.setValueAtTime(3200 * (o.pitch ?? 1), t)
      f.Q.setValueAtTime(1.2, t)
      const g = ctx.createGain()
      env(g, t, o.gain ?? 0.5, 0.001, 0.03)
      src.connect(f).connect(g).connect(ctx.destination)
      src.start(t)
      src.stop(t + 0.05)
    },
    thunk(o = {}) {
      if (!sound.enabled) return
      osc('sine', 90 * (o.pitch ?? 1), o.gain ?? 0.7, 0.004, 0.18, 48 * (o.pitch ?? 1))
    },
    tick(o = {}) {
      if (!sound.enabled) return
      osc('sine', 1500 * (o.pitch ?? 1), o.gain ?? 0.18, 0.001, 0.015)
    },
    tone(freq, seconds, o = {}) {
      if (!sound.enabled) return
      osc('sine', freq, o.gain ?? 0.25, 0.01, Math.max(0.02, seconds - 0.01))
    },
  }
  return sound
}
