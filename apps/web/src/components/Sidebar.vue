<script setup lang="ts">
import type { User, Page } from '../App.vue'

defineProps<{ me: User | null; page: Page }>()
const emit = defineEmits<{
  navigate: [page: Page]
  logout: []
}>()
</script>

<template>
  <aside class="w-56 shrink-0 bg-zinc-900 flex flex-col py-6 px-4 gap-1">
    <div class="mb-6">
      <h1 class="text-lg font-bold text-white">🎵 Music Core</h1>
      <p v-if="me" class="text-xs text-zinc-400 mt-1 truncate">{{ me.display_name }}</p>
    </div>

    <nav class="flex flex-col gap-1 flex-1">
      <button
        class="sidebar-btn"
        :class="{ active: page === 'tracks' }"
        @click="emit('navigate', 'tracks')"
      >
        🎧 Tracks
      </button>
      <button
        v-if="me?.role === 'artist' || me?.role === 'admin'"
        class="sidebar-btn"
        :class="{ active: page === 'upload' }"
        @click="emit('navigate', 'upload')"
      >
        ⬆️ Upload
      </button>
      <button
        v-if="me?.role === 'artist' || me?.role === 'admin'"
        class="sidebar-btn"
        :class="{ active: page === 'dashboard' }"
        @click="emit('navigate', 'dashboard')"
      >
        📊 Dashboard
      </button>
    </nav>

    <div class="mt-auto flex flex-col gap-1">
      <button
        v-if="!me"
        class="sidebar-btn"
        :class="{ active: page === 'login' }"
        @click="emit('navigate', 'login')"
      >
        🔑 Login
      </button>
      <button
        v-if="!me"
        class="sidebar-btn"
        :class="{ active: page === 'register' }"
        @click="emit('navigate', 'register')"
      >
        ✏️ Register
      </button>
      <button
        v-if="me"
        class="sidebar-btn text-red-400 hover:text-red-300"
        @click="emit('logout')"
      >
        🚪 Logout
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-btn {
  @apply w-full text-left px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors;
}
.sidebar-btn.active {
  @apply bg-zinc-800 text-white;
}
</style>
