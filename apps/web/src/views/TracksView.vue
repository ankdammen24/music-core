<script setup lang="ts">
import type { Track } from '../App.vue'

defineProps<{
  tracks: Track[]
  currentTrack: Track | null
  token: string
  api: string
}>()

const emit = defineEmits<{
  play: [track: Track]
  reload: []
}>()

const statusColor = (status: string) => {
  if (status === 'ready') return 'text-green-400'
  if (status === 'processing') return 'text-yellow-400'
  return 'text-red-400'
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Tracks</h2>
      <button class="text-sm text-zinc-400 hover:text-white" @click="emit('reload')">
        ↻ Refresh
      </button>
    </div>

    <div v-if="tracks.length === 0" class="text-zinc-500 text-center py-20">
      Inga låtar ännu.
    </div>

    <!-- Header -->
    <div class="grid grid-cols-[2rem_1fr_1fr_6rem] gap-4 text-xs text-zinc-500 uppercase px-4 mb-2 border-b border-zinc-800 pb-2">
      <span>#</span>
      <span>Titel</span>
      <span>Artist</span>
      <span>Status</span>
    </div>

    <div
      v-for="(track, i) in tracks"
      :key="track.id"
      class="grid grid-cols-[2rem_1fr_1fr_6rem] gap-4 items-center px-4 py-3 rounded-md hover:bg-zinc-800 group transition-colors cursor-pointer"
      :class="{ 'bg-zinc-800/50': currentTrack?.id === track.id }"
      @click="emit('play', track)"
    >
      <span class="text-zinc-500 text-sm group-hover:hidden">{{ i + 1 }}</span>
      <span
        v-if="track.normalization_status === 'ready'"
        class="hidden group-hover:block text-green-400 text-sm"
      >▶</span>
      <span
        v-else
        class="hidden group-hover:block text-zinc-500 text-sm"
      >—</span>

      <div class="min-w-0">
        <p
          class="font-medium truncate text-sm"
          :class="currentTrack?.id === track.id ? 'text-green-400' : 'text-white'"
        >
          {{ track.title }}
        </p>
      </div>

      <p class="text-zinc-400 text-sm truncate">{{ track.artist_name }}</p>

      <span class="text-xs" :class="statusColor(track.normalization_status)">
        {{ track.normalization_status }}
      </span>
    </div>
  </div>
</template>
