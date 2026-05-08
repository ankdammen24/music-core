<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PlayerBar from './components/PlayerBar.vue'
import Sidebar from './components/Sidebar.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import TracksView from './views/TracksView.vue'
import UploadView from './views/UploadView.vue'
import DashboardView from './views/DashboardView.vue'

export type Page = 'login' | 'register' | 'tracks' | 'upload' | 'dashboard'

export interface Track {
  id: string
  title: string
  artist_name: string
  normalization_status: string
  integrated_loudness_lufs: number
  true_peak_dbtp: number
  created_at: string
}

export interface User {
  id: string
  email: string
  display_name: string
  role: 'listener' | 'artist' | 'admin'
}

const api = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const token = ref(localStorage.getItem('token') ?? '')
const me = ref<User | null>(null)
const tracks = ref<Track[]>([])
const page = ref<Page>('tracks')
const currentTrack = ref<Track | null>(null)
const queue = ref<Track[]>([])

const authHeaders = (): Record<string, string> =>
  token.value ? { Authorization: `Bearer ${token.value}` } : {}

const loadMe = async () => {
  if (!token.value) return
  const r = await fetch(`${api}/auth/me`, { headers: authHeaders() })
  if (r.ok) me.value = (await r.json()).user
}

const loadTracks = async () => {
  const r = await fetch(`${api}/tracks`)
  if (r.ok) {
    const d = await r.json()
    tracks.value = d.tracks ?? []
  }
}

const onLogin = async (t: string) => {
  token.value = t
  localStorage.setItem('token', t)
  await loadMe()
  page.value = 'tracks'
}

const onLogout = () => {
  token.value = ''
  me.value = null
  localStorage.removeItem('token')
  currentTrack.value = null
  page.value = 'tracks'
}

const playTrack = (track: Track) => {
  if (track.normalization_status !== 'ready') return
  currentTrack.value = track
  // Sätt resten av listan som kö
  const idx = tracks.value.findIndex(t => t.id === track.id)
  queue.value = tracks.value.slice(idx + 1).filter(t => t.normalization_status === 'ready')
}

const onNext = () => {
  if (queue.value.length === 0) return
  const next = queue.value.shift()!
  const idx = tracks.value.findIndex(t => t.id === next.id)
  queue.value = tracks.value.slice(idx + 1).filter(t => t.normalization_status === 'ready')
  currentTrack.value = next
}

const onPrev = () => {
  if (!currentTrack.value) return
  const idx = tracks.value.findIndex(t => t.id === currentTrack.value!.id)
  if (idx <= 0) return
  const ready = tracks.value.slice(0, idx).filter(t => t.normalization_status === 'ready')
  if (ready.length === 0) return
  currentTrack.value = ready[ready.length - 1]
}

onMounted(async () => {
  await Promise.all([loadTracks(), loadMe()])
})
</script>

<template>
  <div class="flex h-screen bg-zinc-950 text-white overflow-hidden">

    <!-- Sidebar -->
    <Sidebar
      :me="me"
      :page="page"
      @navigate="page = $event"
      @logout="onLogout"
    />

    <!-- Huvudinnehåll -->
    <main class="flex-1 overflow-y-auto pb-24">
      <LoginView
        v-if="page === 'login'"
        :api="api"
        @logged-in="onLogin"
        @go-register="page = 'register'"
      />
      <RegisterView
        v-else-if="page === 'register'"
        :api="api"
        @logged-in="onLogin"
        @go-login="page = 'login'"
      />
      <TracksView
        v-else-if="page === 'tracks'"
        :tracks="tracks"
        :current-track="currentTrack"
        :token="token"
        :api="api"
        @play="playTrack"
        @reload="loadTracks"
      />
      <UploadView
        v-else-if="page === 'upload'"
        :api="api"
        :token="token"
        @uploaded="loadTracks"
      />
      <DashboardView
        v-else-if="page === 'dashboard'"
        :tracks="tracks.filter(t => t.artist_name === me?.display_name)"
      />
    </main>

    <!-- Spelare längst ner -->
    <PlayerBar
      v-if="currentTrack"
      :track="currentTrack"
      :api="api"
      :token="token"
      :has-next="queue.length > 0"
      @next="onNext"
      @prev="onPrev"
    />
  </div>
</template>
