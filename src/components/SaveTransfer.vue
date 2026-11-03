<script setup>
import { ref } from 'vue'
import { exportSave, importSave } from '../progress.js'

const code = ref('')
const message = ref(null) // { ok: bool, text }

async function doExport() {
  code.value = exportSave()
  try {
    await navigator.clipboard.writeText(code.value)
    message.value = { ok: true, text: 'Code copié ! Colle-le sur ton autre appareil.' }
  } catch {
    message.value = { ok: true, text: 'Copie ce code et colle-le sur ton autre appareil.' }
  }
}

function doImport() {
  if (!code.value.trim()) {
    message.value = { ok: false, text: 'Colle d’abord un code de sauvegarde.' }
    return
  }
  if (!confirm('Remplacer ta progression actuelle par celle de ce code ?')) return
  try {
    importSave(code.value)
    message.value = { ok: true, text: 'Progression importée.' }
    code.value = ''
  } catch (e) {
    message.value = { ok: false, text: e.message }
  }
}
</script>

<template>
  <section class="transfer">
    <h2>💾 Sauvegarde</h2>
    <p>Transfère ta progression (graines, améliorations, étoiles) vers un autre appareil ou navigateur.</p>
    <textarea
      v-model="code"
      rows="3"
      spellcheck="false"
      placeholder="Clique sur « Exporter » pour obtenir ton code, ou colle ici un code pour l’importer."
      @focus="$event.target.select()"
    />
    <div class="actions">
      <button class="btn small" @click="doExport">📤 Exporter</button>
      <button class="btn small ghost" @click="doImport">📥 Importer</button>
      <span v-if="message" class="msg" :class="{ error: !message.ok }">{{ message.text }}</span>
    </div>
  </section>
</template>

<style scoped>
.transfer {
  margin-top: 28px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
}
h2 {
  margin: 0 0 4px;
  font-size: 1.1rem;
}
p {
  margin: 0 0 10px;
  opacity: 0.8;
  font-size: 0.9rem;
}
textarea {
  width: 100%;
  resize: vertical;
  padding: 8px 10px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: #f1f8e9;
  font: 0.8rem ui-monospace, Consolas, monospace;
  word-break: break-all;
  user-select: text;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}
.msg {
  font-size: 0.9rem;
  color: #c5e1a5;
}
.msg.error {
  color: #ffab91;
}
</style>
