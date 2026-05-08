<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface NowPlayingData {
  now_playing: {
    song: { text: string; artist: string; title: string; art: string }
    duration: number
    elapsed: number
  }
  listeners: { current: number }
  live: { is_live: boolean; streamer_name: string }
  station: { listen_url: string }
}

const AZURACAST_URL = import.meta.env.VITE_AZURACAST_URL
const STATION_ID = import.meta.env.VITE_AZURACAST_STATION_ID ?? '1'
const data = ref<NowPlayingData | null>(null)
let eventSource: EventSource | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

const fetchNowPlaying = async () => {
  try {
    const r = await fetch(`${AZURACAST_URL}/api/nowplaying/${STATION_ID}`)
    if (r.ok) data.value = await r.json()
  } catch {}
}

const subscribe = () => {
  if (!AZURACAST_URL) return
  eventSource = new EventSource(`${AZURACAST_URL}/api/live/nowplaying/${STATION_ID}`)
  eventSource.onmessage = (e) => {
    try { data.value = JSON.parse(e.data) } catch {}
  }
  eventSource.onerror = () => {
    eventSource?.close()
    pollInterval = setInterval(fetchNowPlaying, 10_000)
  }
}

const progress = () => {
  if (!data.value) return 0
  const { elapsed, duration } = data.value.now_playing
  return duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0
}

onMounted(async () => { await fetchNowPlaying(); subscribe() })
onUnmounted(() => { eventSource?.close(); if (pollInterval) clearInterval(pollInterval) })
</script>

<template>
  <div v-if="AZURACAST_URL && data" class="bg-zinc-800 rounded-xl p-4 mx-6 mb-4">
    <p class="text-xs text-zinc-500 uppercase mb-3 font-medium">Radio - on air</p>
    <div class="flex items-center gap-3">
      <img
        v-if="data.now_playing.song.art"
        :src="data.now_playing.song.art"
        class="w-12 h-12 rounded-md object-cover shrink-0"
        alt="albumomslag"
      />
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm truncate">{{ data.now_playing.song.title }}</p>
        <p class="text-zinc-400 text-xs truncate">{{ data.now_playing.song.artist }}</p>
        <div class="mt-2 w-full bg-zinc-700 rounded-full h-1">
          <div
            class="bg-green-400 h-1 rounded-full transition-all duration-1000"
            :style="{ width: progress() + '%' }"
          />
        </div>
      </div>
      <div class="text-right text-xs text-zinc-500 shrink-0">
        <p>{{ data.listeners.current }} lyssnare</p>
        <p v-if="data.live.is_live" class="text-red-400 font-medium mt-1">Live</p>
        <a v-if="data.station.listen_url" :href="data.station.listen_url" target="_blank" class="text-green-400 hover:text-green-300 mt-1 block">Lyssna live</a>
      </div>
    </div>
  </div>
</template>
