// Dimensions du plateau (en pixels internes du canvas)
export const ROWS = 5
export const COLS = 9
export const CELL = 96
export const BOARD_X = 72 // bande de terre à gauche : la cabane à protéger
export const BOARD_W = COLS * CELL
export const WIDTH = BOARD_X + BOARD_W + 96 // + zone d'arrivée des insectes
export const HEIGHT = ROWS * CELL

export const START_DEW = 150
export const DEW = {
  value: 25,
  lifetime: 9, // secondes au sol avant évaporation
  skyInterval: [7, 11], // délai entre deux gouttes tombées du ciel
}

export const DEFENDERS = {
  rosee: {
    name: 'Fleur de rosée',
    emoji: '🌼',
    cost: 50,
    cooldown: 7.5,
    hp: 300,
    produce: { first: 6, every: 18 },
    desc: 'Produit une goutte de rosée régulièrement.',
  },
  tomate: {
    name: 'Tomate canonnière',
    emoji: '🍅',
    cost: 100,
    cooldown: 7.5,
    hp: 300,
    attack: { every: 1.4, damage: 20, speed: 320 },
    desc: 'Tire des pépins sur les insectes de sa rangée.',
  },
  citrouille: {
    name: 'Citrouille rempart',
    emoji: '🎃',
    cost: 50,
    cooldown: 25,
    hp: 4000,
    desc: 'Encaisse les morsures très longtemps.',
  },
  piment: {
    name: 'Piment explosif',
    emoji: '🌶️',
    cost: 150,
    cooldown: 35,
    hp: 9999,
    explode: { fuse: 1, damage: 1800, range: 1.5 }, // range en cases
    desc: 'Explose et pulvérise les insectes autour de lui.',
  },
}
export const DEFENDER_ORDER = ['rosee', 'tomate', 'citrouille', 'piment']

export const ENEMIES = {
  fourmi: { name: 'Fourmi', emoji: '🐜', hp: 110, speed: 34, bite: 50, size: 44, desc: 'Rapide mais fragile.' },
  limace: { name: 'Limace', emoji: '🐌', hp: 200, speed: 18, bite: 40, size: 52, desc: 'Lente et gourmande.' },
  scarabee: { name: 'Scarabée', emoji: '🪲', hp: 700, speed: 15, bite: 90, size: 58, desc: 'Carapace très résistante.' },
  sauterelle: {
    name: 'Sauterelle',
    emoji: '🦗',
    hp: 140,
    speed: 30,
    bite: 50,
    size: 50,
    jump: { duration: 0.6, speedAfter: 16 }, // saute par-dessus la première plante, puis ralentit
    desc: 'Saute par-dessus la première plante rencontrée.',
  },
}
