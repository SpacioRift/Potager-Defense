<script setup>
import { reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Game } from '../game/Game.js'
import { DEFENDER_ORDER } from '../game/config.js'
import { LEVELS, STAR_RULES, SEEDS_PER_NEW_STAR, starsFor } from '../game/levels.js'
import { buildDefenders, computeRewards } from '../game/upgrades.js'
import { progress, addSeeds, recordStars, unlockedPlants } from '../progress.js'
import { play } from '../game/audio.js'
import { startMusic, stopMusic, pauseMusic } from '../game/music.js'
import SeedBar from './SeedBar.vue'

const props = defineProps({ levelIndex: { type: Number, required: true } })
const emit = defineEmits(['restart', 'next', 'menu', 'serre'])

const level = LEVELS[props.levelIndex]
const hasNext = props.levelIndex < LEVELS.length - 1

// Stats figées au lancement : acheter une amélioration n'affecte que la partie suivante
const defs = buildDefenders(progress.upgrades)
const available = unlockedPlants()
const canvas = ref(null)
const ui = reactive({
  dew: 0, selected: null, cooldowns: {}, status: 'playing', progress: 0, banner: '', paused: false, speed: 1,
})
const result = ref(null) // bilan de fin de partie
let game = null

onMounted(() => {
  game = new Game(canvas.value, ui, level, defs, available)
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
    const won = status === 'won'
    const stars = won ? starsFor(game.lost) : 0
    const newStars = won ? recordStars(level.id, stars) : 0
    const rewards = computeRewards(won, game.planted, available, {
      winSeeds: level.seeds,
      starBonus: newStars * SEEDS_PER_NEW_STAR,
    })
    addSeeds(rewards)
    result.value = {
      rewards,
      stars,
      newStars,
      lost: game.lost,
      rule: STAR_RULES.find((r) => r.stars === stars)?.label,
      newPlant: won && level.unlocks && !available.includes(level.unlocks) ? level.unlocks : null,
    }
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
      :available="available"
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
        <template v-if="result">
          <div v-if="ui.status === 'won'" class="stars">
            <span v-for="n in 3" :key="n" class="star" :class="{ on: n <= result.stars }" :style="{ animationDelay: `${n * 0.25}s` }">★</span>
          </div>
          <p v-if="ui.status === 'won'" class="star-info">
            {{ result.rule }}
            <template v-if="result.lost">
              · {{ result.lost }} plante{{ result.lost > 1 ? 's' : '' }} dévorée{{ result.lost > 1 ? 's' : '' }}
            </template>
            <strong v-if="result.newStars">
              <br />+{{ result.newStars }} nouvelle{{ result.newStars > 1 ? 's' : '' }} étoile{{ result.newStars > 1 ? 's' : '' }} :
              +{{ result.newStars * SEEDS_PER_NEW_STAR }} 🌱 par plante
            </strong>
          </p>
          <div v-if="result.newPlant" class="unlock">
            🎉 Nouvelle plante débloquée : {{ defs[result.newPlant].emoji }} <strong>{{ defs[result.newPlant].name }}</strong>
          </div>
          <div class="rewards">
            <span class="label">Graines récoltées</span>
            <div class="list">
              <span v-for="type in DEFENDER_ORDER.filter((t) => t in result.rewards)" :key="type" class="reward">
                {{ defs[type].emoji }} <strong>+{{ result.rewards[type] }}</strong> 🌱
              </span>
            </div>
          </div>
        </template>
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
  justify-content: safe center;
  overflow-y: auto;
  gap: 10px;
  background: rgba(20, 30, 10, 0.72);
  line-height: 1.2;
  padding: 16px;
}
.overlay h2 {
  font-size: clamp(1.4rem, 4vw, 2.4rem);
  margin: 0 0 8px;
}
.stars {
  display: flex;
  gap: 8px;
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  line-height: 1;
}
.star {
  color: rgba(255, 255, 255, 0.2);
  animation: star-pop 0.4s backwards;
}
.star.on {
  color: #ffd54f;
  text-shadow: 0 0 16px rgba(255, 213, 79, 0.7);
}
@keyframes star-pop {
  from {
    transform: scale(0) rotate(-90deg);
    opacity: 0;
  }
}
.star-info {
  margin: 0;
  text-align: center;
  opacity: 0.9;
}
.unlock {
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 213, 79, 0.2);
  border: 2px solid #ffd54f;
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
