<script setup>
import { DEFENDER_ORDER } from '../game/config.js'
import { reactive } from 'vue'
import { plantLevel } from '../progress.js'
import { getAudioSettings, setSfx } from '../game/audio.js'
import { setMusic } from '../game/music.js'

const audio = reactive(getAudioSettings())
function toggle(key) {
  audio[key] = !audio[key]
  ;(key === 'sfx' ? setSfx : setMusic)(audio[key])
}

const props = defineProps({
  ui: { type: Object, required: true },
  defs: { type: Object, required: true },
})
defineEmits(['select', 'pause', 'speed'])

const cooldown = (type) => props.ui.cooldowns[type] || 0
const ready = (type) => props.ui.dew >= props.defs[type].cost && cooldown(type) === 0
</script>

<template>
  <div class="seedbar">
    <div class="dew" title="Rosée">💧 <span>{{ ui.dew }}</span></div>

    <button
      v-for="(type, i) in DEFENDER_ORDER"
      :key="type"
      class="card"
      :class="{ selected: ui.selected === type, disabled: !ready(type) }"
      :title="`${defs[type].name} — ${defs[type].desc} (${i + 1})`"
      @click="$emit('select', type)"
    >
      <span class="lvl">{{ plantLevel(type) }}</span>
      <span class="emoji">{{ defs[type].emoji }}</span>
      <span class="cost">{{ defs[type].cost }}</span>
      <span class="cd" :style="{ height: cooldown(type) * 100 + '%' }" />
    </button>

    <button
      class="card shovel"
      :class="{ selected: ui.selected === 'shovel' }"
      title="Pelle : retirer un défenseur (S)"
      @click="$emit('select', 'shovel')"
    >
      <span class="emoji">🪏</span>
    </button>

    <div class="right">
      <div class="progress" title="Progression du niveau">
        <div class="fill" :style="{ width: ui.progress * 100 + '%' }" />
        <span class="flag">🚩</span>
      </div>
      <button class="btn small" :class="{ off: !audio.sfx }" title="Bruitages" @click="toggle('sfx')">
        {{ audio.sfx ? '🔊' : '🔇' }}
      </button>
      <button class="btn small" :class="{ off: !audio.music }" title="Musique" @click="toggle('music')">🎵</button>
      <button class="btn small" title="Vitesse" @click="$emit('speed')">x{{ ui.speed }}</button>
      <button class="btn small" title="Pause (P)" @click="$emit('pause')">{{ ui.paused ? '▶' : '⏸' }}</button>
    </div>
  </div>
</template>

<style scoped>
.seedbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #6d4c33;
  border-radius: 12px 12px 0 0;
  border: 3px solid #4e3524;
  border-bottom: none;
  flex-wrap: wrap;
}
.dew {
  min-width: 84px;
  padding: 6px 10px;
  background: #3e2a1c;
  border-radius: 8px;
  font-size: 1.3rem;
  font-weight: 700;
  text-align: center;
}
.card {
  position: relative;
  width: 64px;
  height: 72px;
  border: 2px solid #c8b08a;
  border-radius: 8px;
  background: #f3e5c8;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.1s;
}
.card:hover {
  transform: translateY(-2px);
}
.card.selected {
  border-color: #ffeb3b;
  box-shadow: 0 0 0 3px #ffeb3b;
}
.card.disabled {
  filter: grayscale(0.7) brightness(0.75);
}
.emoji {
  font-size: 2rem;
  line-height: 1;
}
.cost {
  font-size: 0.85rem;
  font-weight: 700;
  color: #3e2a1c;
}
.lvl {
  position: absolute;
  top: 2px;
  left: 3px;
  min-width: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: #558b2f;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 16px;
}
.cd {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
.shovel {
  background: #bcaaa4;
}
.right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn.off {
  filter: grayscale(1);
  opacity: 0.6;
}
.progress {
  position: relative;
  width: 140px;
  height: 14px;
  background: #3e2a1c;
  border-radius: 7px;
  overflow: visible;
}
.fill {
  height: 100%;
  background: linear-gradient(90deg, #aed581, #e57373);
  border-radius: 7px;
}
.flag {
  position: absolute;
  right: -6px;
  top: -10px;
  font-size: 1rem;
}
</style>
