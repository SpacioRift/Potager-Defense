// Séquenceur musical : joue les thèmes écrits dans themes.js avec des instruments synthétisés.
import { audioCore, settings, saveSettings } from './audio.js'
import { THEMES } from './themes.js'

let ctx, out, noiseBuffer

// ---------------------------------------------------------------- notes et accords

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const CHORD_TYPES = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10] }

/** "C#5" → numéro MIDI */
function midi(name) {
  const [, letter, acc, oct] = name.match(/^([A-G])([b#]?)(\d)$/)
  return 12 * (Number(oct) + 1) + NOTE_BASE[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0)
}

/** "Am" → { root: MIDI à l'octave 3, tones: intervalles } */
function chord(name) {
  const [, letter, acc, type] = name.match(/^([A-G])([b#]?)(m7|m|7)?$/)
  return { root: midi(`${letter}${acc}3`), tones: CHORD_TYPES[type ?? ''] }
}

const freq = (m) => 440 * 2 ** ((m - 69) / 12)

// ---------------------------------------------------------------- briques de synthèse

function osc(type, f, t, end) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  o.start(t)
  o.stop(end)
  return o
}

/** Enveloppe : montée `a`, tenue jusqu'à `hold` puis relâche `r` — ou décroissance libre `decay` */
function env(t, { vol, a = 0.01, hold = 0, r = 0.08, decay }) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + a)
  if (decay) {
    g.gain.exponentialRampToValueAtTime(0.001, t + a + decay)
  } else {
    const end = t + Math.max(a, hold)
    g.gain.setValueAtTime(vol, end)
    g.gain.exponentialRampToValueAtTime(0.001, end + r)
  }
  return g
}

function filter(type, f, q = 0.7) {
  const b = ctx.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  b.Q.value = q
  return b
}

function noiseHit(t, { vol, type, f, q = 1, decay }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.connect(filter(type, f, q)).connect(env(t, { vol, a: 0.001, decay })).connect(out)
  src.start(t, Math.random() * 0.5)
  src.stop(t + decay + 0.05)
}

// ---------------------------------------------------------------- instruments
// Chaque instrument : (fréquence, début, durée, volume)

const INSTRUMENTS = {
  // sifflet doux avec vibrato qui arrive après l'attaque
  whistle(f, t, dur, vol) {
    const end = t + dur + 0.2
    const g = env(t, { vol, a: 0.03, hold: dur, r: 0.12 })
    const o = osc('sine', f, t, end)
    const o2 = osc('triangle', f, t, end)
    const o2g = ctx.createGain()
    o2g.gain.value = 0.25
    const lfo = osc('sine', 5.5, t, end)
    const depth = ctx.createGain()
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(f * 0.009, t + 0.18)
    lfo.connect(depth)
    depth.connect(o.frequency)
    depth.connect(o2.frequency)
    o.connect(g)
    o2.connect(o2g).connect(g)
    g.connect(out)
  },
  // lame de bois frappée : fondamentale + partiel aigu très bref
  marimba(f, t, dur, vol) {
    osc('sine', f, t, t + 0.7).connect(env(t, { vol, a: 0.002, decay: 0.5 })).connect(out)
    osc('sine', f * 3.9, t, t + 0.15).connect(env(t, { vol: vol * 0.25, a: 0.001, decay: 0.07 })).connect(out)
  },
  // anche (clarinette/basson) : carrés légèrement désaccordés, filtrés
  reed(f, t, dur, vol) {
    const hold = Math.max(0.05, dur * 0.8)
    const lp = filter('lowpass', 1700, 2)
    const g = env(t, { vol, a: 0.012, hold, r: 0.05 })
    osc('square', f, t, t + hold + 0.1).connect(lp)
    const o2 = osc('square', f * 1.004, t, t + hold + 0.1)
    const half = ctx.createGain()
    half.gain.value = 0.5
    o2.connect(half).connect(lp)
    lp.connect(g).connect(out)
  },
  // puce 8-bit avec petite glissade d'attaque
  chip(f, t, dur, vol) {
    const end = t + dur + 0.08
    const o = osc('square', f * 0.94, t, end)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03)
    o.connect(filter('lowpass', 3800)).connect(env(t, { vol, a: 0.004, hold: dur * 0.9, r: 0.04 })).connect(out)
  },
  // arpège 8-bit court
  chipArp(f, t, dur, vol) {
    osc('square', f, t, t + 0.2).connect(filter('lowpass', 2400)).connect(env(t, { vol, a: 0.002, decay: 0.12 })).connect(out)
  },
  // tuba d'oompah
  tuba(f, t, dur, vol) {
    const hold = Math.max(0.06, dur * 0.6)
    osc('sawtooth', f, t, t + hold + 0.15)
      .connect(filter('lowpass', 420, 1.2))
      .connect(env(t, { vol, a: 0.02, hold, r: 0.08 }))
      .connect(out)
  },
  // cuivres en accord plaqué (contretemps de fanfare)
  brass(f, t, dur, vol) {
    const lp = filter('lowpass', 900, 1)
    lp.frequency.setValueAtTime(600, t)
    lp.frequency.linearRampToValueAtTime(1500, t + 0.04)
    osc('sawtooth', f, t, t + 0.25).connect(lp).connect(env(t, { vol, a: 0.01, hold: 0.07, r: 0.08 })).connect(out)
  },
  // basse pincée ronde
  pluckBass(f, t, dur, vol) {
    osc('triangle', f, t, t + 0.6).connect(env(t, { vol, a: 0.004, decay: 0.45 })).connect(out)
    osc('sine', f / 2, t, t + 0.6).connect(env(t, { vol: vol * 0.6, a: 0.004, decay: 0.4 })).connect(out)
  },
  // basse funk : dent de scie avec filtre qui se referme
  funkBass(f, t, dur, vol) {
    const hold = Math.max(0.05, dur * 0.75)
    const lp = filter('lowpass', 1400, 5)
    lp.frequency.setValueAtTime(1400, t)
    lp.frequency.exponentialRampToValueAtTime(220, t + 0.16)
    osc('sawtooth', f, t, t + hold + 0.1).connect(lp).connect(env(t, { vol, a: 0.004, hold, r: 0.05 })).connect(out)
    osc('sine', f / 2, t, t + hold + 0.1).connect(env(t, { vol: vol * 0.5, a: 0.004, hold, r: 0.05 })).connect(out)
  },
}

const DRUMS = {
  k(t, vol) {
    const o = osc('sine', 150, t, t + 0.35)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    o.connect(env(t, { vol, a: 0.001, decay: 0.3 })).connect(out)
  },
  s(t, vol) {
    noiseHit(t, { vol: vol * 0.8, type: 'bandpass', f: 1900, q: 0.8, decay: 0.16 })
    osc('triangle', 190, t, t + 0.12).connect(env(t, { vol: vol * 0.5, a: 0.001, decay: 0.08 })).connect(out)
  },
  h(t, vol) {
    noiseHit(t, { vol: vol * 0.35, type: 'highpass', f: 7500, decay: 0.035 })
  },
}

// ---------------------------------------------------------------- lecture

let theme = null
let timer = null
let nextTime = 0
let step = 0 // en croches depuis le début
let intensity = 0
let paused = false
let running = false

/** Prépare une piste : liste de { step, midi, length } à partir des jetons (".", "-" = tenue) */
function parseMelody(bars) {
  const notes = []
  bars.join(' ').split(/\s+/).forEach((tok, i) => {
    if (tok === '-') {
      if (notes.length) notes.at(-1).length++
    } else if (tok !== '.') {
      notes.push({ step: i, midi: midi(tok), length: 1 })
    }
  })
  return notes
}

function prepare(def) {
  const melody = parseMelody(def.melody)
  const byStep = new Map(melody.map((n) => [n.step, n]))
  return { ...def, byStep, length: def.melody.length * 8, chordList: def.chords.map((c) => c.split('/').map(chord)) }
}

// accord en cours à une croche donnée (gère les mesures à deux accords "Bb/C")
function chordAt(s) {
  const bar = Math.floor(s / 8) % theme.chordList.length
  const parts = theme.chordList[bar]
  return parts[Math.min(parts.length - 1, Math.floor(((s % 8) / 8) * parts.length))]
}

function chordTone(ch, token, baseOctave) {
  const shift = 12 * baseOctave
  if (token === 'R') return ch.root + shift
  if (token === '3') return ch.root + ch.tones[1] + shift
  if (token === '5') return ch.root + 7 + shift
  if (token === '8') return ch.root + 12 + shift
  if (token === '7') return ch.root + (ch.tones[3] ?? 10) + shift
  return ch.root + ch.tones[(Number(token) - 1) % ch.tones.length] + shift // "1", "2", "3"
}

function scheduleStep(t) {
  const s = step % theme.length
  const beat = s % 8
  const stepDur = 60 / theme.bpm / 2
  const mix = theme.mix
  const ch = chordAt(s)

  // mélodie
  const note = theme.byStep.get(s)
  if (note) {
    INSTRUMENTS[theme.lead](freq(note.midi), t, note.length * stepDur, mix.lead)
    // pendant une nuée, la mélodie est doublée à l'octave inférieure
    if (intensity) INSTRUMENTS[theme.lead](freq(note.midi - 12), t, note.length * stepDur, mix.lead * 0.45)
  }

  // basse
  const bassTok = theme.bass.pattern.split(' ')[beat]
  if (bassTok !== '.' && bassTok !== '-') {
    const pattern = theme.bass.pattern.split(' ')
    let len = 1
    while (pattern[beat + len] === '-') len++
    INSTRUMENTS[theme.bass.voice](freq(chordTone(ch, bassTok, -1)), t, len * stepDur, mix.bass)
  }

  // accompagnement
  const compTok = theme.comp.pattern.split(' ')[beat]
  if (compTok === 'c') {
    for (const tone of ch.tones.slice(0, 3)) INSTRUMENTS[theme.comp.voice](freq(ch.root + 12 + tone), t, stepDur, mix.comp)
  } else if (compTok !== '.') {
    INSTRUMENTS[theme.comp.voice](freq(chordTone(ch, compTok, 1)), t, stepDur, mix.comp)
  }

  // batterie (grille en doubles croches : 2 cases par croche)
  const kit = intensity ? theme.drums.intense : theme.drums.calm
  for (let half = 0; half < 2; half++) {
    const i = beat * 2 + half
    for (const [voice, line] of Object.entries(kit)) {
      if (line[i] === 'x') DRUMS[voice](t + (half * stepDur) / 2, mix.drums)
    }
  }
  step++
}

function applyVolume() {
  const core = audioCore()
  if (!core) return
  const audible = running && settings.music && !paused
  core.musicBus.gain.setTargetAtTime(audible ? 0.55 : 0, core.ctx.currentTime, 0.15)
}

export const MUSIC_THEMES = THEMES.map(({ id, name, desc }) => ({ id, name, desc }))

/** Lance un thème depuis le début (le premier si l'id est inconnu) */
export function startMusic(themeId) {
  const core = audioCore()
  if (!core) return
  ;({ ctx, noiseBuffer } = core)
  out = core.musicBus
  stopTimer()
  theme = prepare(THEMES.find((th) => th.id === themeId) ?? THEMES[0])
  running = true
  paused = false
  intensity = 0
  step = 0
  nextTime = ctx.currentTime + 0.1
  // planification avec un peu d'avance pour un tempo stable
  timer = setInterval(() => {
    if (paused) {
      nextTime = ctx.currentTime + 0.05
      return
    }
    while (nextTime < ctx.currentTime + 0.2) {
      scheduleStep(nextTime)
      nextTime += 60 / theme.bpm / 2
    }
  }, 50)
  applyVolume()
}

function stopTimer() {
  clearInterval(timer)
  timer = null
}

export function stopMusic() {
  running = false
  stopTimer()
  applyVolume()
}

export function pauseMusic(value) {
  paused = value
  applyVolume()
}

export function setMusic(on) {
  settings.music = on
  saveSettings()
  applyVolume()
}

/** 0 = calme, 1 = nuée en cours (batterie plus dense + mélodie doublée) */
export function setMusicIntensity(value) {
  intensity = value
}
