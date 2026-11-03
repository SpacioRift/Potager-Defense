import { reactive, watch } from 'vue'
import { DEFENDERS } from './game/config.js'
import { LEVELS } from './game/levels.js'
import { LEVEL_COSTS, MAX_LEVEL, PLANT_UPGRADES } from './game/upgrades.js'

// Progression du joueur (graines + niveaux d'amélioration), sauvegardée dans le navigateur.
const KEY = 'potager-defense:progress'

function blank() {
  const types = Object.keys(DEFENDERS)
  return {
    seeds: Object.fromEntries(types.map((t) => [t, 0])),
    upgrades: Object.fromEntries(types.map((t) => [t, {}])),
    cleared: [], // ids des niveaux réussis
  }
}

function load() {
  const data = blank()
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    for (const type of Object.keys(data.seeds)) {
      data.seeds[type] = saved?.seeds?.[type] ?? 0
      data.upgrades[type] = saved?.upgrades?.[type] ?? {}
    }
    data.cleared = saved?.cleared ?? []
  } catch {
    // sauvegarde absente ou illisible : on repart de zéro
  }
  return data
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

export function markCleared(levelId) {
  if (!progress.cleared.includes(levelId)) progress.cleared.push(levelId)
}

// Un niveau est débloqué si c'est le premier ou si le précédent est réussi
export const isUnlocked = (index) => index === 0 || progress.cleared.includes(LEVELS[index - 1].id)

export function resetProgress() {
  Object.assign(progress, blank())
}
