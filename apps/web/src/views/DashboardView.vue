<script setup lang="ts">
import type { Track } from '../App.vue'

defineProps<{ tracks: Track[] }>()

const fmt = (n: number | null) => (n != null ? n.toFixed(1) : '—')
</script>

<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-6">Artist Dashboard</h2>

    <div v-if="tracks.length === 0" class="text-zinc-500 text-center py-20">
      Du har inte laddat upp några låtar än.
    </div>

    <div class="flex flex-col gap-3">
      <div
        v-for="track in tracks"
        :key="track.id"
        class="bg-zinc-800 rounded-xl p-4 flex items-center gap-4"
      >
        <div class="flex-1 min-w-0">
          <p class="font-semibold truncate">{{ track.title }}</p>
          <p class="text-xs text-zinc-400 mt-0.5">
            Uppladdad {{ new Date(track.created_at).toLocaleDateString('sv-SE') }}
          </p>
        </div>

        <div class="flex gap-6 text-center text-xs text-zinc-400 shrink-0">
          <div>
            <p class="text-white font-mono">{{ fmt(track.integrated_loudness_lufs) }}</p>
            <p>LUFS</p>
          </div>
          <div>
            <p class="text-white font-mono">{{ fmt(track.true_peak_dbtp) }}</p>
            <p>True Peak</p>
          </div>
          <div>
            <span
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="{
                'bg-green-900 text-green-300': track.normalization_status === 'ready',
                'bg-yellow-900 text-yellow-300': track.normalization_status === 'processing',
                'bg-red-900 text-red-300': track.normalization_status === 'failed',
              }"
            >
              {{ track.normalization_status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
