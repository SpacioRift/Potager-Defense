import { reactive, watch } from 'vue'
import { DEFENDERS, DEFENDER_ORDER } from './game/config.js'
import { LEVELS, STARTER_PLANTS } from './game/levels.js'
import { LEVEL_COSTS, MAX_LEVEL, PLANT_UPGRADES } from './game/upgrades.js'

// Progression du joueur (graines, améliorations, étoiles), sauvegardée dans le navigateur.
const KEY = 'potager-defense:progress'

function blank() {
  const types = Object.keys(DEFENDERS)
  return {
    seeds: Object.fromEntries(types.map((t) => [t, 0])),
    upgrades: Object.fromEntries(types.map((t) => [t, {}])),
    stars: {}, // id du niveau → meilleur nombre d'étoiles (1 à 3)
  }
}

const int = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v) || 0)))

/** Nettoie des données venant du stockage ou d'un import : seules les clés connues sont gardées. */
function sanitize(saved) {
  const data = blank()
  for (const type of Object.keys(data.seeds)) {
    data.seeds[type] = int(saved?.seeds?.[type], 0, 1e6)
    for (const key of PLANT_UPGRADES[type]) {
      const lvl = int(saved?.upgrades?.[type]?.[key], 0, MAX_LEVEL)
      if (lvl) data.upgrades[type][key] = lvl
    }
  }
  for (const { id } of LEVELS) {
    const stars = int(saved?.stars?.[id], 0, 3)
    // anciennes sauvegardes : liste `cleared` sans étoiles → 1 étoile
    if (stars) data.stars[id] = stars
    else if (saved?.cleared?.includes?.(id)) data.stars[id] = 1
  }
  return data
}

function load() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return blank() // sauvegarde absente ou illisible : on repart de zéro
  }
}

export const progress = reactive(load())

watch(
  progress,
  (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // stockage indisponible (navigation privée…) : la progression ne dure que la session
    }
  },
  { deep: true },
)

// ---------------------------------------------------------------- améliorations

export const levelOf = (type, key) => progress.upgrades[type][key] || 0

export const plantLevel = (type) => 1 + PLANT_UPGRADES[type].reduce((sum, key) => sum + levelOf(type, key), 0)

export function upgradeCost(type, key) {
  const level = levelOf(type, key)
  return level < MAX_LEVEL ? LEVEL_COSTS[level] : null
}

export function buyUpgrade(type, key) {
  const cost = upgradeCost(type, key)
  if (cost === null || progress.seeds[type] < cost) return false
  progress.seeds[type] -= cost
  progress.upgrades[type][key] = levelOf(type, key) + 1
  return true
}

export function addSeeds(rewards) {
  for (const [type, n] of Object.entries(rewards)) progress.seeds[type] += n
}

// ---------------------------------------------------------------- niveaux et étoiles

export const starsOf = (levelId) => progress.stars[levelId] || 0
export const isCleared = (levelId) => starsOf(levelId) > 0
export const totalStars = () => Object.values(progress.stars).reduce((a, b) => a + b, 0)

/** Enregistre un résultat et renvoie le nombre de nouvelles étoiles gagnées. */
export function recordStars(levelId, stars) {
  const gained = Math.max(0, stars - starsOf(levelId))
  if (gained) progress.stars[levelId] = stars
  return gained
}

// Un niveau est débloqué si c'est le premier ou si le précédent est réussi
export const isUnlocked = (index) => index === 0 || isCleared(LEVELS[index - 1].id)

// ---------------------------------------------------------------- plantes débloquées

/** Index du niveau qui débloque cette plante (null si disponible dès le départ) */
export function unlockLevelIndex(type) {
  if (STARTER_PLANTS.includes(type)) return null
  const i = LEVELS.findIndex((l) => l.unlocks === type)
  return i === -1 ? null : i
}

export function isPlantUnlocked(type) {
  const i = unlockLevelIndex(type)
  return i === null || isCleared(LEVELS[i].id)
}

export const unlockedPlants = () => DEFENDER_ORDER.filter(isPlantUnlocked)

// ---------------------------------------------------------------- export / import

const SAVE_PREFIX = 'PD1-'

/** Code texte portable : préfixe de version + JSON en base64 */
export function exportSave() {
  const json = JSON.stringify(progress)
  return SAVE_PREFIX + btoa(unescape(encodeURIComponent(json)))
}

/** Remplace la progression par celle du code. Lève une erreur si le code est invalide. */
export function importSave(code) {
  const trimmed = code.trim().replace(/\s+/g, '')
  if (!trimmed.startsWith(SAVE_PREFIX)) throw new Error('Ce code ne vient pas de Potager Defense.')
  let saved
  try {
    saved = JSON.parse(decodeURIComponent(escape(atob(trimmed.slice(SAVE_PREFIX.length)))))
  } catch {
    throw new Error('Code illisible : il a peut-être été coupé lors du copier-coller.')
  }
  Object.assign(progress, sanitize(saved))
}

export function resetProgress() {
  Object.assign(progress, blank())
}
