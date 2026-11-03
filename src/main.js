import { createApp } from 'vue'
import App from './App.vue'
import { unlockAudio } from './game/audio.js'
import './style.css'

// Les navigateurs n'autorisent l'audio qu'après une interaction
window.addEventListener('pointerdown', unlockAudio)
window.addEventListener('keydown', unlockAudio)

createApp(App).mount('#app')
