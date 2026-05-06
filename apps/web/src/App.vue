<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type Track = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cover_image_path: string | null;
  artist_id: string;
  stream_url: string;
};

type Profile = { id: string; display_name: string; role: string };

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const token = ref(localStorage.getItem('token') ?? '');
const tracks = ref<Track[]>([]);
const queue = ref<Track[]>([]);
const search = ref('');
const currentIndex = ref(-1);
const isPlaying = ref(false);
const repeatMode = ref<'off' | 'one' | 'all'>('off');
const shuffled = ref(false);
const audio = ref<HTMLAudioElement | null>(null);
const me = ref<Profile | null>(null);

const authHeaders = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});

const filteredTracks = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return tracks.value;
  return tracks.value.filter((track) =>
    [track.title, track.description ?? '', track.artist_id].some((value) => value.toLowerCase().includes(term))
  );
});

const currentTrack = computed(() => (currentIndex.value >= 0 ? queue.value[currentIndex.value] ?? null : null));

const syncAudioSource = () => {
  if (!audio.value || !currentTrack.value) return;
  audio.value.src = `${apiBase}${currentTrack.value.stream_url}`;
};

const loadTracks = async () => {
  const res = await fetch(`${apiBase}/tracks`, { headers: authHeaders() });
  const data = await res.json();
  tracks.value = data.tracks ?? [];
  if (!queue.value.length) {
    queue.value = [...tracks.value];
  }
};

const loadMe = async () => {
  if (!token.value) return;
  const res = await fetch(`${apiBase}/auth/me`, { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  me.value = data.user;
};

const playAt = async (index: number) => {
  if (!audio.value) return;
  if (index < 0 || index >= queue.value.length) return;
  currentIndex.value = index;
  syncAudioSource();
  await audio.value.play();
  isPlaying.value = true;
};

const togglePlayPause = async () => {
  if (!audio.value) return;
  if (!currentTrack.value && queue.value.length) {
    await playAt(0);
    return;
  }
  if (isPlaying.value) {
    audio.value.pause();
    isPlaying.value = false;
  } else {
    await audio.value.play();
    isPlaying.value = true;
  }
};

const next = async () => {
  if (!queue.value.length) return;
  if (repeatMode.value === 'one' && currentIndex.value >= 0) {
    await playAt(currentIndex.value);
    return;
  }
  const nextIndex = currentIndex.value + 1;
  if (nextIndex < queue.value.length) return playAt(nextIndex);
  if (repeatMode.value === 'all') return playAt(0);
  isPlaying.value = false;
};

const previous = async () => {
  if (!queue.value.length) return;
  const prevIndex = currentIndex.value - 1;
  if (prevIndex >= 0) return playAt(prevIndex);
  if (repeatMode.value === 'all') return playAt(queue.value.length - 1);
};

const toggleShuffle = () => {
  shuffled.value = !shuffled.value;
  if (shuffled.value) {
    queue.value = [...tracks.value].sort(() => Math.random() - 0.5);
  } else {
    queue.value = [...tracks.value];
  }
  currentIndex.value = -1;
  isPlaying.value = false;
};

const cycleRepeat = () => {
  if (repeatMode.value === 'off') repeatMode.value = 'one';
  else if (repeatMode.value === 'one') repeatMode.value = 'all';
  else repeatMode.value = 'off';
};

onMounted(async () => {
  audio.value = new Audio();
  audio.value.addEventListener('ended', () => {
    void next();
  });
  await loadMe();
  await loadTracks();
});
</script>

<template>
  <main class="mx-auto max-w-5xl p-6 space-y-6">
    <h1 class="text-3xl font-bold">Listener Dashboard</h1>

    <input
      v-model="token"
      @change="localStorage.setItem('token', token)"
      class="w-full rounded border p-2"
      placeholder="Paste JWT token (required for playback)"
    />

    <p class="text-sm text-gray-600">Logged in as: {{ me?.display_name ?? 'Unknown' }} ({{ me?.role ?? 'guest' }})</p>

    <section class="rounded border p-4 space-y-3">
      <h2 class="text-xl font-semibold">Browse & Search</h2>
      <input v-model="search" class="w-full rounded border p-2" placeholder="Search tracks" />
      <ul class="space-y-2 max-h-96 overflow-auto">
        <li v-for="(track, idx) in filteredTracks" :key="track.id" class="flex items-center justify-between rounded border p-3">
          <div class="flex items-center gap-3">
            <img v-if="track.cover_image_path" :src="track.cover_image_path" alt="cover" class="h-12 w-12 rounded object-cover" />
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-xs text-gray-600">Artist: {{ track.artist_id }}</p>
            </div>
          </div>
          <button class="rounded bg-black px-3 py-1 text-white" @click="playAt(queue.findIndex((q) => q.id === track.id) >= 0 ? queue.findIndex((q) => q.id === track.id) : idx)">Play</button>
        </li>
      </ul>
    </section>

    <section class="rounded border p-4 space-y-3">
      <h2 class="text-xl font-semibold">Player</h2>
      <p><span class="font-medium">Now playing:</span> {{ currentTrack?.title ?? 'Nothing selected' }}</p>
      <p><span class="font-medium">Artist:</span> {{ currentTrack?.artist_id ?? '-' }}</p>
      <img v-if="currentTrack?.cover_image_path" :src="currentTrack.cover_image_path" class="h-24 w-24 rounded object-cover" alt="Current track cover" />
      <div class="flex flex-wrap gap-2">
        <button class="rounded border px-3 py-1" @click="previous">Previous</button>
        <button class="rounded border px-3 py-1" @click="togglePlayPause">{{ isPlaying ? 'Pause' : 'Play' }}</button>
        <button class="rounded border px-3 py-1" @click="next">Next</button>
        <button class="rounded border px-3 py-1" @click="toggleShuffle">Shuffle: {{ shuffled ? 'On' : 'Off' }}</button>
        <button class="rounded border px-3 py-1" @click="cycleRepeat">Repeat: {{ repeatMode }}</button>
      </div>

      <div>
        <h3 class="font-medium">Queue</h3>
        <ol class="list-decimal pl-5 text-sm">
          <li v-for="(track, idx) in queue" :key="track.id" :class="{ 'font-semibold': idx === currentIndex }">{{ track.title }}</li>
        </ol>
      </div>
    </section>
  </main>
</template>
