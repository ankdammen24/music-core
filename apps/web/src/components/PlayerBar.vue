<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import type { Track } from '../App.vue'

const props = defineProps<{
  track: Track
  api: string
  token: string
  hasNext: boolean
}>()

const emit = defineEmits<{
  next: []
  prev: []
}>()

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const muted = ref(false)

const streamUrl = computed(() =>
  `${props.api}/tracks/${props.track.id}/stream`
)

// Byt låt när track-prop ändras
watch(() => props.track.id, async () => {
  playing.value = false
  currentTime.value = 0
  duration.value = 0
  await nextTick()
  play()
})

const nextTick = () => new Promise(r => setTimeout(r, 50))

const play = async () => {
  if (!audio.value) return
  try {
    await audio.value.play()
    playing.value = true
  } catch {}
}

const pause = () => {
  audio.value?.pause()
  playing.value = false
}

const toggle = () => playing.value ? pause() : play()

const seek = (e: Event) => {
  if (!audio.value) return
  audio.value.currentTime = Number((e.target as HTMLInputElement).value)
}

const changeVolume = (e: Event) => {
  volume.value = Number((e.target as HTMLInputElement).value)
  if (audio.value) audio.value.volume = volume.value
}

const toggleMute = () => {
  muted.value = !muted.value
  if (audio.value) audio.value.muted = muted.value
}

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const onEnded = () => {
  playing.value = false
  if (props.hasNext) emit('next')
}

onUnmounted(() => audio.value?.pause())
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 z-50">

    <!-- Dold audio-element med auth-header via blob URL -->
    <audio
      ref="audio"
      :src="streamUrl"
      @timeupdate="currentTime = audio?.currentTime ?? 0"
      @durationchange="duration = audio?.duration ?? 0"
      @ended="onEnded"
      @canplay="play"
      :volume="volume"
      preload="metadata"
    />

    <div class="max-w-4xl mx-auto flex items-center gap-4">

      <!-- Låtinfo -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate">{{ track.title }}</p>
        <p class="text-xs text-zinc-400 truncate">{{ track.artist_name }}</p>
      </div>

      <!-- Kontroller -->
      <div class="flex flex-col items-center gap-1 flex-1">
        <div class="flex items-center gap-4">
          <button
            class="control-btn"
            @click="emit('prev')"
          >
            ⏮
          </button>
          <button
            class="control-btn text-xl w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center hover:scale-105 transition-transform"
            @click="toggle"
          >
            {{ playing ? '⏸' : '▶' }}
          </button>
          <button
            class="control-btn"
            :class="{ 'opacity-30': !hasNext }"
            @click="emit('next')"
            :disabled="!hasNext"
          >
            ⏭
          </button>
        </div>

        <!-- Progress -->
        <div class="flex items-center gap-2 w-full max-w-sm">
          <span class="text-xs text-zinc-400 w-8 text-right">{{ fmt(currentTime) }}</span>
          <input
            type="range"
            min="0"
            :max="duration || 100"
            :value="currentTime"
            @input="seek"
            class="flex-1 h-1 accent-green-400"
          />
          <span class="text-xs text-zinc-400 w-8">{{ fmt(duration) }}</span>
        </div>
      </div>

      <!-- Volym -->
      <div class="flex items-center gap-2 flex-1 justify-end">
        <button class="control-btn text-sm" @click="toggleMute">
          {{ muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊' }}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          :value="volume"
          @input="changeVolume"
          class="w-24 h-1 accent-green-400"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
.control-btn {
  @apply text-zinc-300 hover:text-white transition-colors cursor-pointer;
}
</style>
