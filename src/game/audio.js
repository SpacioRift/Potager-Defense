// Sons 100 % synthétisés avec la Web Audio API : aucun fichier audio à charger.

const SETTINGS_KEY = 'potager-defense:audio'
export const settings = { sfx: true, music: true }
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)))
} catch {
  // réglages par défaut
}

let ctx = null
let sfxBus, noiseBuffer
// Bus musique : son direct + écho + réverbération (voir music.js)
let musicBus = null

/** À appeler sur un geste utilisateur : les navigateurs bloquent l'audio avant. */
export function unlockAudio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    ctx = new AudioCtx()
    // compresseur léger en sortie : évite la saturation quand tout joue en même temps
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    comp.connect(ctx.destination)
    const master = ctx.createGain()
    master.connect(comp)

    sfxBus = ctx.createGain()
    sfxBus.gain.value = settings.sfx ? 0.7 : 0
    sfxBus.connect(master)

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    musicBus = createMusicBus(master)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

function createMusicBus(master) {
  const input = ctx.createGain()
  input.gain.value = 0
  input.connect(master)

  // écho en croche pointée
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.33
  const feedback = ctx.createGain()
  feedback.gain.value = 0.25
  const delayTone = ctx.createBiquadFilter()
  delayTone.type = 'lowpass'
  delayTone.frequency.value = 2500
  const delayOut = ctx.createGain()
  delayOut.gain.value = 0.18
  input.connect(delay).connect(delayTone).connect(feedback).connect(delay)
  delayTone.connect(delayOut).connect(master)

  // réverbération : réponse impulsionnelle générée (bruit qui décroît)
  const reverb = ctx.createConvolver()
  const len = Math.floor(ctx.sampleRate * 2.2)
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  }
  reverb.buffer = impulse
  const reverbOut = ctx.createGain()
  reverbOut.gain.value = 0.22
  input.connect(reverb).connect(reverbOut).connect(master)

  return input
}

/** Accès bas niveau pour le séquenceur musical */
export const audioCore = () => (ctx ? { ctx, musicBus, noiseBuffer } : null)

export const getAudioSettings = () => ({ ...settings })

/** État du contexte audio ('none' | 'suspended' | 'running'), pratique pour déboguer */
export const audioState = () => ctx?.state ?? 'none'

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // stockage indisponible
  }
}

export function setSfx(on) {
  settings.sfx = on
  saveSettings()
  if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.02)
}

// ---------------------------------------------------------------- briques de base

function tone({ type = 'sine', freq, to, dur, vol = 0.3, attack = 0.005, delay = 0, bus = sfxBus }) {
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(bus)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise({ dur, vol = 0.3, filter = 'lowpass', freq = 1000, to, q = 1, delay = 0 }) {
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(freq, t)
  if (to) biquad.frequency.exponentialRampToValueAtTime(to, t + dur)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(biquad).connect(gain).connect(sfxBus)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

// ---------------------------------------------------------------- bruitages

const SOUNDS = {
  select: () => tone({ type: 'triangle', freq: 1200, dur: 0.05, vol: 0.08 }),
  error: () => tone({ type: 'square', freq: 140, dur: 0.14, vol: 0.08 }),
  plant: () => {
    tone({ freq: 240, to: 90, dur: 0.18, vol: 0.4 })
    noise({ dur: 0.12, freq: 700, vol: 0.12 })
  },
  shovel: () => noise({ dur: 0.25, freq: 500, to: 200, vol: 0.3 }),
  shoot: () => tone({ type: 'triangle', freq: 720, to: 280, dur: 0.08, vol: 0.1 }),
  hit: () => noise({ dur: 0.06, filter: 'bandpass', freq: 1800, q: 2, vol: 0.2 }),
  collect: () => {
    tone({ freq: 880, dur: 0.12, vol: 0.16 })
    tone({ freq: 1320, dur: 0.2, vol: 0.16, delay: 0.07 })
  },
  produce: () => tone({ freq: 1500, to: 2200, dur: 0.12, vol: 0.05 }),
  bite: () => {
    noise({ dur: 0.06, filter: 'bandpass', freq: 900, q: 4, vol: 0.25 })
    noise({ dur: 0.05, filter: 'bandpass', freq: 1300, q: 4, vol: 0.2, delay: 0.09 })
  },
  plantLost: () => {
    tone({ type: 'square', freq: 330, to: 110, dur: 0.3, vol: 0.08 })
    noise({ dur: 0.2, freq: 1500, to: 300, vol: 0.15 })
  },
  die: () => {
    tone({ type: 'sawtooth', freq: 420, to: 70, dur: 0.22, vol: 0.08 })
    noise({ dur: 0.15, freq: 900, vol: 0.12 })
  },
  jump: () => tone({ freq: 300, to: 950, dur: 0.22, vol: 0.08 }),
  fuse: () => noise({ dur: 0.9, filter: 'highpass', freq: 3000, vol: 0.08 }),
  explode: () => {
    noise({ dur: 0.9, freq: 2500, to: 80, vol: 0.7 })
    tone({ freq: 110, to: 30, dur: 0.8, vol: 0.6 })
  },
  wave: () => {
    tone({ type: 'sawtooth', freq: 196, dur: 0.35, vol: 0.12, attack: 0.03 })
    tone({ type: 'sawtooth', freq: 262, dur: 0.7, vol: 0.12, attack: 0.03, delay: 0.32 })
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.35, vol: 0.18, delay: i * 0.12 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ type: 'sawtooth', freq: f, dur: 0.4, vol: 0.08, delay: i * 0.18 })),
}

// écart minimal entre deux occurrences du même son, pour éviter la cacophonie
const MIN_GAP = { shoot: 0.05, hit: 0.04, bite: 0.25, die: 0.05, produce: 0.2 }
const lastPlayed = {}

export function play(name) {
  if (!ctx || ctx.state !== 'running' || !settings.sfx) return
  const now = ctx.currentTime
  if (now - (lastPlayed[name] ?? -1) < (MIN_GAP[name] ?? 0)) return
  lastPlayed[name] = now
  SOUNDS[name]()
}

