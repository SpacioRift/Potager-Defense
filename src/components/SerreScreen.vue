<script setup>
import { DEFENDERS, DEFENDER_ORDER } from '../game/config.js'
import { MAX_LEVEL, PLANT_UPGRADES, UPGRADES, buildDefender } from '../game/upgrades.js'
import { progress, levelOf, plantLevel, upgradeCost, buyUpgrade, resetProgress } from '../progress.js'

defineEmits(['play', 'menu'])

// Valeur de la stat au niveau actuel, et au suivant s'il existe
function values(type, key) {
  const levels = progress.upgrades[type]
  const now = UPGRADES[key].format(buildDefender(type, levels))
  if (levelOf(type, key) >= MAX_LEVEL) return { now }
  const next = UPGRADES[key].format(buildDefender(type, { ...levels, [key]: levelOf(type, key) + 1 }))
  return { now, next }
}

function reset() {
  if (confirm('Effacer toutes les graines et améliorations ?')) resetProgress()
}
</script>

<template>
  <main class="serre">
    <header>
      <h1>🌱 La Serre</h1>
      <p>Dépense les graines gagnées en partie pour améliorer chaque plante.</p>
    </header>

    <section class="plants">
      <article v-for="type in DEFENDER_ORDER" :key="type" class="plant">
        <div class="head">
          <span class="ico">{{ DEFENDERS[type].emoji }}</span>
          <div class="title">
            <strong>{{ DEFENDERS[type].name }}</strong>
            <small>Niveau {{ plantLevel(type) }}</small>
          </div>
          <span class="seeds" title="Graines de cette plante">🌱 {{ progress.seeds[type] }}</span>
        </div>

        <div v-for="key in PLANT_UPGRADES[type]" :key="key" class="upgrade">
          <div class="info">
            <span class="name">{{ UPGRADES[key].icon }} {{ UPGRADES[key].label }}</span>
            <span class="pips">
              <i v-for="n in MAX_LEVEL" :key="n" :class="{ on: n <= levelOf(type, key) }" />
            </span>
            <small>
              {{ values(type, key).now }}
              <template v-if="values(type, key).next">→ <b>{{ values(type, key).next }}</b></template>
            </small>
          </div>
          <button
            v-if="upgradeCost(type, key) !== null"
            class="btn small buy"
            :disabled="progress.seeds[type] < upgradeCost(type, key)"
            :title="`${UPGRADES[key].perLevel} par niveau`"
            @click="buyUpgrade(type, key)"
          >
            🌱 {{ upgradeCost(type, key) }}
          </button>
          <span v-else class="max">MAX</span>
        </div>
      </article>
    </section>

    <footer>
      <button class="btn big" @click="$emit('play')">Jouer</button>
      <button class="btn ghost" @click="$emit('menu')">Menu</button>
      <button class="link" @click="reset">Réinitialiser la progression</button>
    </footer>
  </main>
</template>

<style scoped>
.serre {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 16px;
}
header {
  text-align: center;
  margin-bottom: 24px;
}
h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  margin: 0 0 4px;
  text-shadow: 0 4px 0 #2e4d1c;
}
header p {
  opacity: 0.8;
  margin: 0;
}
.plants {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.plant {
  background: #f3e5c8;
  color: #3e2a1c;
  border: 3px solid #c8b08a;
  border-radius: 14px;
  padding: 14px;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ico {
  font-size: 2.4rem;
}
.title {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.title small {
  color: #558b2f;
  font-weight: 700;
}
.seeds {
  background: #3e2a1c;
  color: #f1f8e9;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 700;
}
.upgrade {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid #dccaa6;
}
.info {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 2px;
}
.name {
  font-weight: 700;
}
.pips {
  display: flex;
  gap: 3px;
  align-items: center;
}
.pips i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #dccaa6;
}
.pips i.on {
  background: #7cb342;
}
.info small {
  grid-column: 1 / -1;
  opacity: 0.85;
}
.buy {
  white-space: nowrap;
}
.buy:disabled {
  filter: grayscale(1);
  opacity: 0.5;
  cursor: not-allowed;
}
.max {
  font-weight: 800;
  color: #558b2f;
  padding: 0 10px;
}
footer {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 28px;
}
.link {
  background: none;
  border: none;
  color: #f1f8e9;
  opacity: 0.6;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}
</style>
