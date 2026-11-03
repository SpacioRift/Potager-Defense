<script setup>
import { ref } from 'vue'
import TitleScreen from './components/TitleScreen.vue'
import LevelSelect from './components/LevelSelect.vue'
import GameView from './components/GameView.vue'
import SerreScreen from './components/SerreScreen.vue'

const screen = ref('title')
const levelIndex = ref(0)
const runId = ref(0)

function play(index = levelIndex.value) {
  levelIndex.value = index
  runId.value++
  screen.value = 'game'
}
</script>

<template>
  <TitleScreen v-if="screen === 'title'" @play="screen = 'levels'" @serre="screen = 'serre'" />
  <LevelSelect
    v-else-if="screen === 'levels'"
    @play="play"
    @serre="screen = 'serre'"
    @menu="screen = 'title'"
  />
  <SerreScreen v-else-if="screen === 'serre'" @play="screen = 'levels'" @menu="screen = 'title'" />
  <GameView
    v-else
    :key="runId"
    :level-index="levelIndex"
    @restart="play()"
    @next="play(levelIndex + 1)"
    @menu="screen = 'levels'"
    @serre="screen = 'serre'"
  />
</template>
