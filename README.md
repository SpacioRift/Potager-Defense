# Potager Defense

Tower defense en couloirs : des légumes défendent un potager contre des vagues d'insectes.
Stack : Vite + Vue 3, rendu du plateau en Canvas 2D.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # build statique dans dist/
```

## Structure

- `src/game/config.js` : dimensions du plateau, stats des défenseurs et des insectes
- `src/game/levels.js` : niveaux (vagues, rangées, nuit, thème musical, graines gagnées)
- `src/game/upgrades.js` : améliorations des plantes et calcul des graines gagnées
- `src/game/Game.js` : moteur (boucle, simulation, rendu canvas, particules, entrées souris)
- `src/game/audio.js` : bruitages synthétisés (Web Audio API)
- `src/game/music.js` + `themes.js` : séquenceur et partitions des thèmes musicaux
- `src/progress.js` : progression du joueur (graines, améliorations, niveaux réussis) sauvegardée en `localStorage`
- `src/components/` : UI Vue (titre/juke-box, sélection des niveaux, serre, barre de cartes, overlays)

Le moteur et Vue ne communiquent que via l'objet réactif `ui` (rosée, sélection, recharges, statut…).
En dev, l'instance est exposée dans `window.game` pour déboguer depuis la console.
