<script setup>
import { reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Game } from '../game/Game.js'
import { DEFENDER_ORDER } from '../game/config.js'
import { LEVELS } from '../game/levels.js'
import { buildDefenders, computeRewards } from '../game/upgrades.js'
import { progress, addSeeds, markCleared } from '../progress.js'
import { play } from '../game/audio.js'
import { startMusic, stopMusic, pauseMusic } from '../game/music.js'
import SeedBar from './SeedBar.vue'

const props = defineProps({ levelIndex: { type: Number, required: true } })
const emit = defineEmits(['restart', 'next', 'menu', 'serre'])

const level = LEVELS[props.levelIndex]
const hasNext = props.levelIndex < LEVELS.length - 1

// Stats figées au lancement : acheter une amélioration n'affecte que la partie suivante
const defs = buildDefenders(progress.upgrades)
const canvas = ref(null)
const ui = reactive({
  dew: 0, selected: null, cooldowns: {}, status: 'playing', progress: 0, banner: '', paused: false, speed: 1,
})
const rewards = ref(null)
let game = null

onMounted(() => {
  game = new Game(canvas.value, ui, level, defs)
  game.start()
  game.showBanner(`Niveau ${props.levelIndex + 1} · ${level.name}`)
  startMusic(level.music)
  if (import.meta.env.DEV) window.game = game // debug depuis la console
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  game?.stop()
  stopMusic()
  window.removeEventListener('keydown', onKey)
})

watch(() => ui.paused, pauseMusic)

watch(
  () => ui.status,
  (status) => {
    if (status === 'playing') return
    stopMusic()
    play(status === 'won' ? 'win' : 'lose')
    rewards.value = computeRewards(status === 'won', game.planted, level.seeds)
    addSeeds(rewards.value)
    if (status === 'won') markCleared(level.id)
  },
)

function select(type) {
  if (ui.selected === type) ui.selected = null
  else if (type === 'shovel' || game.canPlant(type)) {
    ui.selected = type
    play('select')
  } else play('error')
}

function onKey(e) {
  const index = Number(e.key) - 1
  if (DEFENDER_ORDER[index]) select(DEFENDER_ORDER[index])
  else if (e.key === 's' || e.key === 'S') select('shovel')
  else if (e.key === 'Escape') ui.selected = null
  else if (e.key === 'p' || e.key === 'P') ui.paused = !ui.paused
}
</script>

<template>
  <main class="game">
    <SeedBar
      :ui="ui"
      :defs="defs"
      @select="select"
      @pause="ui.paused = !ui.paused"
      @speed="ui.speed = ui.speed === 1 ? 2 : 1"
    />

    <div class="board">
      <canvas
        ref="canvas"
        @pointermove="game?.pointerMove($event)"
        @pointerleave="game?.pointerLeave()"
        @pointerdown="game?.click($event)"
        @contextmenu.prevent="ui.selected = null"
      />

      <Transition name="banner">
        <div v-if="ui.banner && !ui.paused && ui.status === 'playing'" class="banner">{{ ui.banner }}</div>
      </Transition>

      <div v-if="ui.paused && ui.status === 'playing'" class="overlay">
        <h2>Pause</h2>
        <button class="btn" @click="ui.paused = false">Reprendre</button>
        <button class="btn ghost" @click="emit('menu')">Niveaux</button>
      </div>

      <div v-if="ui.status !== 'playing'" class="overlay">
        <h2>{{ ui.status === 'won' ? '🏆 Potager sauvé !' : '🐛 Les insectes ont tout mangé…' }}</h2>
        <div v-if="rewards" class="rewards">
          <span class="label">Graines récoltées</span>
          <div class="list">
            <span v-for="type in DEFENDER_ORDER" :key="type" class="reward">
              {{ defs[type].emoji }} <strong>+{{ rewards[type] }}</strong> 🌱
            </span>
          </div>
        </div>
        <div class="actions">
          <button v-if="ui.status === 'won' && hasNext" class="btn" @click="emit('next')">Niveau suivant ▶</button>
          <button class="btn" @click="emit('serre')">🌱 Améliorer</button>
          <button class="btn" @click="emit('restart')">Rejouer</button>
          <button class="btn ghost" @click="emit('menu')">Niveaux</button>
        </div>
      </div>
    </div>

    <p class="hint">1-4 : défenseurs · S : pelle · clic droit / Échap : annuler · P : pause</p>
  </main>
</template>

<style scoped>
.game {
  max-width: 1040px;
  margin: 0 auto;
  padding: 16px;
}
.board {
  position: relative;
  border: 3px solid #4e3524;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  line-height: 0;
}
canvas {
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
}
.banner {
  position: absolute;
  inset: 40% 0 auto;
  text-align: center;
  font-size: clamp(1.6rem, 5vw, 3rem);
  font-weight: 800;
  line-height: 1.2;
  color: #fff3e0;
  text-shadow: 0 3px 0 #b71c1c, 0 0 20px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: scale(1.4);
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(20, 30, 10, 0.72);
  line-height: 1.2;
  padding: 16px;
}
.overlay h2 {
  font-size: clamp(1.4rem, 4vw, 2.4rem);
  margin: 0 0 8px;
}
.rewards {
  text-align: center;
  margin-bottom: 8px;
}
.rewards .label {
  opacity: 0.8;
  font-size: 0.9rem;
}
.rewards .list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}
.reward {
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 1.1rem;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.hint {
  opacity: 0.7;
  font-size: 0.85rem;
  text-align: center;
}
</style>
