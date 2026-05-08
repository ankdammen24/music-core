<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ api: string; token: string }>()
const emit = defineEmits<{ uploaded: [] }>()

const file = ref<File | null>(null)
const progress = ref(0)
const uploading = ref(false)
const msg = ref('')
const success = ref(false)

const onFile = (e: Event) => {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  msg.value = ''
  success.value = false
}

const upload = () => {
  if (!file.value) return
  uploading.value = true
  progress.value = 0
  msg.value = ''
  success.value = false

  const fd = new FormData()
  fd.append('file', file.value)

  const xhr = new XMLHttpRequest()
  xhr.open('POST', `${props.api}/tracks/upload`)
  xhr.setRequestHeader('Authorization', `Bearer ${props.token}`)

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100)
  }

  xhr.onload = () => {
    uploading.value = false
    if (xhr.status >= 200 && xhr.status < 300) {
      success.value = true
      msg.value = 'Uppladdad och normaliserad! ✓'
      file.value = null
      emit('uploaded')
    } else {
      try { msg.value = JSON.parse(xhr.responseText).error } catch { msg.value = 'Uppladdning misslyckades' }
    }
  }

  xhr.onerror = () => {
    uploading.value = false
    msg.value = 'Nätverksfel'
  }

  xhr.send(fd)
}
</script>

<template>
  <div class="p-6 max-w-lg">
    <h2 class="text-2xl font-bold mb-8">Ladda upp låt</h2>

    <div class="flex flex-col gap-4">
      <!-- Dropzon -->
      <label
        class="border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center cursor-pointer hover:border-zinc-500 transition-colors"
        :class="{ 'border-green-500': file }"
      >
        <input type="file" accept="audio/*" class="hidden" @change="onFile" />
        <p class="text-2xl mb-2">🎵</p>
        <p class="text-zinc-400 text-sm">
          {{ file ? file.name : 'Klicka eller dra en ljudfil hit' }}
        </p>
        <p class="text-zinc-600 text-xs mt-1">MP3, WAV, FLAC, M4A, OGG</p>
      </label>

      <!-- Progress -->
      <div v-if="uploading" class="space-y-1">
        <div class="flex justify-between text-xs text-zinc-400">
          <span>Laddar upp och normaliserar...</span>
          <span>{{ progress }}%</span>
        </div>
        <div class="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            class="bg-green-400 h-1.5 rounded-full transition-all"
            :style="{ width: progress + '%' }"
          />
        </div>
      </div>

      <p v-if="msg" :class="success ? 'text-green-400' : 'text-red-400'" class="text-sm">
        {{ msg }}
      </p>

      <button
        class="bg-white text-zinc-900 font-semibold py-2 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
        :disabled="!file || uploading"
        @click="upload"
      >
        {{ uploading ? 'Laddar upp...' : 'Ladda upp' }}
      </button>
    </div>
  </div>
</template>
