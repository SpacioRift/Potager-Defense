<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { DEFENDERS, DEFENDER_ORDER, ENEMIES } from '../game/config.js'
import { LEVELS } from '../game/levels.js'
import { MUSIC_THEMES, startMusic, stopMusic } from '../game/music.js'

defineEmits(['play', 'serre'])

const previewing = ref(null)

// Numéros des niveaux qui utilisent ce thème
const levelsUsing = (id) => LEVELS.flatMap((level, i) => (level.music === id ? [i + 1] : []))

// Juke-box : un clic lance l'écoute, un second l'arrête
function toggleTheme(id) {
  if (previewing.value === id) {
    stopMusic()
    previewing.value = null
  } else {
    startMusic(id)
    previewing.value = id
  }
}

onBeforeUnmount(stopMusic)
</script>

<template>
  <main class="title">
    <h1>🥕 Potager Defense 🐌</h1>
    <p class="tagline">Les insectes ont faim. Ton potager est leur buffet. Défends la cabane !</p>

    <div class="menu">
      <button class="btn big" @click="$emit('play')">Jouer</button>
      <button class="btn big ghost" @click="$emit('serre')">🌱 Serre</button>
    </div>

    <section class="music">
      <h2>🎵 Juke-box</h2>
      <div class="themes">
        <button
          v-for="theme in MUSIC_THEMES"
          :key="theme.id"
          class="theme"
          :class="{ selected: previewing === theme.id }"
          @click="toggleTheme(theme.id)"
        >
          <span class="play">{{ previewing === theme.id ? '⏹' : '▶' }}</span>
          <span>
            <strong>{{ theme.name }}</strong>
            <small>{{ theme.desc }}</small>
            <small class="levels">
              {{ levelsUsing(theme.id).length > 1 ? 'Niveaux' : 'Niveau' }} {{ levelsUsing(theme.id).join(', ') }}
            </small>
          </span>
        </button>
      </div>
    </section>

    <section class="cast">
      <div class="panel">
        <h2>Tes défenseurs</h2>
        <ul>
          <li v-for="type in DEFENDER_ORDER" :key="type">
            <span class="ico">{{ DEFENDERS[type].emoji }}</span>
            <div>
              <strong>{{ DEFENDERS[type].name }}</strong> · 💧{{ DEFENDERS[type].cost }}
              <small>{{ DEFENDERS[type].desc }}</small>
            </div>
          </li>
        </ul>
      </div>
      <div class="panel">
        <h2>Les envahisseurs</h2>
        <ul>
          <li v-for="(e, type) in ENEMIES" :key="type">
            <span class="ico">{{ e.emoji }}</span>
            <div>
              <strong>{{ e.name }}</strong>
              <small>{{ e.desc }}</small>
            </div>
          </li>
        </ul>
        <h2>Comment jouer</h2>
        <small>
          Clique sur les gouttes 💧 pour récolter de la rosée, choisis un défenseur puis une case.
          Si un insecte atteint la cabane, c'est perdu. Raccourcis : 1-4, S (pelle), P (pause), Échap.
        </small>
      </div>
    </section>
  </main>
</template>

<style scoped>
.title {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 16px;
  text-align: center;
}
h1 {
  font-size: clamp(2.2rem, 6vw, 4rem);
  margin: 0 0 8px;
  text-shadow: 0 4px 0 #2e4d1c;
}
.tagline {
  opacity: 0.85;
  margin-bottom: 28px;
}
.menu {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.music {
  margin-top: 32px;
}
.themes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.theme {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  font: inherit;
  text-align: left;
  color: #f1f8e9;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
}
.theme.selected {
  border-color: #ffb300;
  background: rgba(255, 179, 0, 0.15);
}
.theme .levels {
  color: #ffd54f;
  opacity: 1;
}
.theme .play {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffb300;
  color: #3e2a1c;
}
.cast {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 36px;
  text-align: left;
}
h2 {
  font-size: 1.05rem;
  margin: 0 0 10px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
li {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
}
.ico {
  font-size: 2rem;
}
small {
  display: block;
  opacity: 0.8;
}
</style>
