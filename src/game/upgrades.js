import { DEFENDERS } from './config.js'

export const MAX_LEVEL = 5
// Coût en graines pour passer du niveau N au niveau N+1
export const LEVEL_COSTS = [3, 6, 10, 15, 22]

const round5 = (n) => Math.max(5, Math.round(n / 5) * 5)

// apply : modifie une copie des stats de base. format : valeur affichée dans la serre.
export const UPGRADES = {
  damage: {
    label: 'Dégâts',
    icon: '💥',
    perLevel: '+20 %',
    apply: (d, l) => (d.attack.damage = Math.round(d.attack.damage * (1 + 0.2 * l))),
    format: (d) => `${d.attack.damage}`,
  },
  rate: {
    label: 'Cadence',
    icon: '⚡',
    perLevel: '+12 %',
    apply: (d, l) => (d.attack.every /= 1 + 0.12 * l),
    format: (d) => `${(1 / d.attack.every).toFixed(2)} tirs/s`,
  },
  production: {
    label: 'Production',
    icon: '💧',
    perLevel: '+12 %',
    apply: (d, l) => (d.produce.every /= 1 + 0.12 * l),
    format: (d) => `1 goutte / ${d.produce.every.toFixed(1)} s`,
  },
  recharge: {
    label: 'Recharge',
    icon: '⏱️',
    perLevel: '-10 %',
    apply: (d, l) => (d.cooldown *= 1 - 0.1 * l),
    format: (d) => `${d.cooldown.toFixed(1)} s`,
  },
  cost: {
    label: 'Prix',
    icon: '🏷️',
    perLevel: '-8 %',
    apply: (d, l) => (d.cost = round5(d.cost * (1 - 0.08 * l))),
    format: (d) => `${d.cost} rosée`,
  },
  hp: {
    label: 'Résistance',
    icon: '🛡️',
    perLevel: '+25 %',
    apply: (d, l) => (d.hp = Math.round(d.hp * (1 + 0.25 * l))),
    format: (d) => `${d.hp} PV`,
  },
}

export const PLANT_UPGRADES = {
  rosee: ['production', 'recharge', 'hp'],
  tomate: ['damage', 'rate', 'recharge'],
  citrouille: ['hp', 'recharge', 'cost'],
  piment: ['recharge', 'cost'],
}

/** Stats d'un défenseur avec les niveaux d'amélioration donnés ({ damage: 2, ... }). */
export function buildDefender(type, levels = {}) {
  const def = structuredClone(DEFENDERS[type])
  for (const key of PLANT_UPGRADES[type]) {
    if (levels[key]) UPGRADES[key].apply(def, levels[key])
  }
  return def
}

export function buildDefenders(upgrades) {
  return Object.fromEntries(Object.keys(DEFENDERS).map((type) => [type, buildDefender(type, upgrades[type])]))
}

/**
 * Graines gagnées en fin de partie, pour chaque plante débloquée (`plants`) :
 * une base (`winSeeds` du niveau en cas de victoire, 1 sinon) + 1 par tranche de 2 plantations (max +5)
 * + `starBonus` (graines des nouvelles étoiles).
 */
export function computeRewards(won, planted, plants, { winSeeds = 3, starBonus = 0 } = {}) {
  return Object.fromEntries(
    plants.map((type) => [
      type,
      (won ? winSeeds : 1) + Math.min(5, Math.floor((planted[type] || 0) / 2)) + starBonus,
    ]),
  )
}
