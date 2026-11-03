// Une vague : `at` = seconde d'arrivée, `big` = nuée annoncée par une bannière.
// spec : "limace*2 fourmi" → ['limace', 'limace', 'fourmi']
const w = (at, spec, big = false) => ({
  at,
  big,
  spawns: spec.split(' ').flatMap((s) => {
    const [type, n = 1] = s.split('*')
    return Array(Number(n)).fill(type)
  }),
})

// Options d'un niveau :
//   lanes    : rangées jouables (toutes par défaut)
//   startDew : rosée de départ
//   night    : pas de rosée tombée du ciel, plateau assombri
//   seeds    : graines gagnées par plante en cas de victoire
//   music    : id du thème musical (themes.js)
export const LEVELS = [
  {
    id: 'pousses',
    name: 'Premières pousses',
    desc: 'Trois rangées et quelques limaces : idéal pour débuter.',
    lanes: [1, 2, 3],
    music: 'matin',
    startDew: 150,
    seeds: 2,
    waves: [
      w(25, 'limace'),
      w(45, 'limace'),
      w(62, 'limace'),
      w(78, 'limace*2'),
      w(95, 'limace fourmi'),
      w(115, 'limace*2 fourmi*2', true),
      w(135, 'limace*2'),
      w(150, 'limace*3 fourmi*2', true),
    ],
  },
  {
    id: 'matin',
    name: 'Le potager du matin',
    desc: 'Tout le jardin est ouvert. Attention aux scarabées.',
    music: 'matin',
    startDew: 150,
    seeds: 3,
    waves: [
      w(22, 'limace'),
      w(40, 'limace'),
      w(55, 'fourmi'),
      w(68, 'limace*2'),
      w(82, 'fourmi limace'),
      w(100, 'limace fourmi limace fourmi scarabee', true),
      w(125, 'scarabee limace'),
      w(140, 'fourmi*2 limace'),
      w(158, 'scarabee limace*2'),
      w(180, 'limace fourmi*2 scarabee limace scarabee fourmi limace', true),
    ],
  },
  {
    id: 'midi',
    name: 'Midi au jardin',
    desc: 'Les sauterelles arrivent et sautent par-dessus la première plante.',
    music: 'fanfare',
    startDew: 150,
    seeds: 4,
    waves: [
      w(24, 'limace'),
      w(40, 'fourmi'),
      w(52, 'sauterelle'),
      w(60, 'fourmi*2'),
      w(75, 'limace sauterelle'),
      w(90, 'scarabee fourmi'),
      w(108, 'fourmi*3 sauterelle*2 limace*2', true),
      w(130, 'scarabee sauterelle'),
      w(145, 'fourmi*2 limace*2'),
      w(162, 'sauterelle*2 scarabee'),
      w(185, 'fourmi*4 sauterelle*3 scarabee*2 limace*2', true),
    ],
  },
  {
    id: 'crepuscule',
    name: 'Crépuscule',
    desc: 'La nuit tombe : plus aucune goutte ne tombe du ciel.',
    night: true,
    music: 'groove',
    startDew: 300,
    seeds: 5,
    waves: [
      w(30, 'limace'),
      w(45, 'limace fourmi'),
      w(62, 'scarabee'),
      w(78, 'sauterelle*2'),
      w(95, 'limace*2 fourmi'),
      w(112, 'scarabee*2 limace*2 sauterelle*2', true),
      w(135, 'fourmi*3'),
      w(150, 'scarabee sauterelle limace'),
      w(168, 'scarabee*2 fourmi*2'),
      w(190, 'scarabee*3 sauterelle*3 limace*3 fourmi*3', true),
    ],
  },
  {
    id: 'invasion',
    name: 'La grande invasion',
    desc: 'Trois nuées, des carapaces partout. Améliore tes plantes avant !',
    music: 'groove',
    startDew: 150,
    seeds: 7,
    waves: [
      w(20, 'limace fourmi'),
      w(35, 'fourmi*2'),
      w(50, 'scarabee sauterelle'),
      w(65, 'limace*2 fourmi*2'),
      w(85, 'scarabee sauterelle*2 fourmi*3 limace*2', true),
      w(110, 'sauterelle*3'),
      w(125, 'scarabee*2 limace*2'),
      w(142, 'fourmi*4 sauterelle*2'),
      w(160, 'scarabee*3 limace*3 sauterelle*2 fourmi*2', true),
      w(185, 'scarabee*2 sauterelle*2'),
      w(200, 'fourmi*4 limace*3'),
      w(220, 'scarabee*5 sauterelle*4 fourmi*4 limace*4', true),
    ],
  },
]
