<script setup>
import { DEFENDERS, ENEMIES } from '../game/config.js'
import { LEVELS, STAR_RULES } from '../game/levels.js'
import { isUnlocked, isCleared, starsOf, totalStars } from '../progress.js'
import { MUSIC_THEMES } from '../game/music.js'

const themeName = (id) => MUSIC_THEMES.find((t) => t.id === id)?.name

defineEmits(['play', 'serre', 'menu'])

// Insectes qui apparaissent dans un niveau (dans l'ordre d'arrivée)
const enemiesOf = (level) => [...new Set(level.waves.flatMap((w) => w.spawns))]

const starsHelp = STAR_RULES.map((r) => `${'★'.repeat(r.stars)} ${r.label}`).join('\n')
</script>

<template>
  <main class="levels">
    <header>
      <h1>🗺️ Le jardin</h1>
      <p>Réussis un niveau pour débloquer le suivant.</p>
      <p class="total" :title="starsHelp">
        <span class="gold">★</span> {{ totalStars() }} / {{ LEVELS.length * 3 }}
      </p>
    </header>

    <section class="list">
      <button
        v-for="(level, i) in LEVELS"
        :key="level.id"
        class="level"
        :class="{ locked: !isUnlocked(i), cleared: isCleared(level.id), night: level.night }"
        :disabled="!isUnlocked(i)"
        @click="$emit('play', i)"
      >
        <span class="num">{{ isUnlocked(i) ? i + 1 : '🔒' }}</span>
        <div class="body">
          <strong>{{ level.name }}</strong>
          <small>{{ level.desc }}</small>
          <div class="meta">
            <span v-if="level.unlocks" class="unlock" :class="{ done: isCleared(level.id) }" title="Plante débloquée par ce niveau">
              Débloque {{ DEFENDERS[level.unlocks].emoji }} {{ DEFENDERS[level.unlocks].name }}
            </span>
            <span class="enemies">
              <span v-for="type in enemiesOf(level)" :key="type" :title="ENEMIES[type].name">{{ ENEMIES[type].emoji }}</span>
            </span>
            <span v-if="level.night" title="Pas de rosée du ciel">🌙</span>
            <span title="Graines par plante en cas de victoire">🌱 +{{ level.seeds }}</span>
            <span class="theme" title="Musique du niveau">🎵 {{ themeName(level.music) }}</span>
          </div>
        </div>
        <span v-if="isUnlocked(i)" class="stars" :title="starsHelp">
          <span v-for="n in 3" :key="n" :class="{ gold: n <= starsOf(level.id) }">★</span>
        </span>
      </button>
    </section>

    <footer>
      <button class="btn" @click="$emit('serre')">🌱 Serre</button>
      <button class="btn ghost" @click="$emit('menu')">Menu</button>
    </footer>
  </main>
</template>

<style scoped>
.levels {
  max-width: 760px;
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
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.level {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 14px 16px;
  font: inherit;
  text-align: left;
  color: #3e2a1c;
  background: #f3e5c8;
  border: 3px solid #c8b08a;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.1s;
}
.level:hover:not(:disabled) {
  transform: translateX(4px);
}
.level.night {
  background: #d9d4ec;
  border-color: #9e97c4;
}
.level.cleared {
  border-color: #7cb342;
}
.level.locked {
  opacity: 0.55;
  cursor: not-allowed;
}
.num {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  background: #6d4c33;
}
.cleared .num {
  background: #558b2f;
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.body strong {
  font-size: 1.1rem;
}
.body small {
  opacity: 0.8;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
  margin-top: 4px;
  font-weight: 700;
  font-size: 0.9rem;
}
.meta .theme {
  font-weight: 400;
  opacity: 0.75;
}
.total {
  margin-top: 10px;
  font-size: 1.2rem;
  font-weight: 800;
  opacity: 1;
}
.stars {
  flex: none;
  font-size: 1.6rem;
  letter-spacing: 2px;
  color: rgba(62, 42, 28, 0.2);
}
.gold {
  color: #ffb300;
  text-shadow: 0 1px 0 #c67c00;
}
.unlock {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(255, 179, 0, 0.25);
  font-weight: 700;
}
.unlock.done {
  background: rgba(124, 179, 66, 0.25);
}
.enemies {
  display: flex;
  gap: 2px;
  font-size: 1.2rem;
}
footer {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 28px;
}
</style>
