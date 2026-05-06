<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

type Track = { id: string; title: string; description: string | null; artist_id: string; stream_url: string; cover_image_path: string | null };
type Playlist = { id: string; name: string };
type Comment = { id: string; user_id: string; display_name: string; body: string; created_at: string };
type Profile = { id: string; display_name: string; role: string };

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const token = ref(localStorage.getItem('token') ?? '');
const tracks = ref<Track[]>([]);
const queue = ref<Track[]>([]);
const currentIndex = ref(-1);
const audio = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const me = ref<Profile | null>(null);
const selectedTrackId = ref<string>('');
const comments = ref<Comment[]>([]);
const commentInput = ref('');
const likeCount = ref(0);
const likedByMe = ref(false);
const playlists = ref<Playlist[]>([]);
const playlistName = ref('');
const selectedPlaylistId = ref('');

const currentTrack = computed(() => (currentIndex.value >= 0 ? queue.value[currentIndex.value] : null));
const selectedTrack = computed(() => tracks.value.find((t) => t.id === selectedTrackId.value) ?? null);
const authHeaders = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});

const loadTracks = async () => { const d = await (await fetch(`${apiBase}/tracks`, { headers: authHeaders() })).json(); tracks.value = d.tracks ?? []; queue.value = [...tracks.value]; if (!selectedTrackId.value && tracks.value[0]) selectedTrackId.value = tracks.value[0].id; };
const loadMe = async () => { if (!token.value) return; const r = await fetch(`${apiBase}/auth/me`, { headers: authHeaders() }); if (r.ok) me.value = (await r.json()).user; };
const playAt = async (index:number) => { if (!audio.value || index < 0 || index >= queue.value.length) return; currentIndex.value = index; audio.value.src = `${apiBase}${queue.value[index].stream_url}`; await audio.value.play(); isPlaying.value = true; };
const loadTrackDetail = async () => { if (!selectedTrackId.value) return; const r = await fetch(`${apiBase}/tracks/${selectedTrackId.value}`, { headers: authHeaders() }); if (!r.ok) return; const d = await r.json(); likeCount.value = d.likes?.count ?? 0; likedByMe.value = d.likes?.liked_by_me ?? false; };
const loadComments = async () => { if (!selectedTrackId.value) return; const d = await (await fetch(`${apiBase}/tracks/${selectedTrackId.value}/comments`, { headers: authHeaders() })).json(); comments.value = d.comments ?? []; };
const addComment = async () => { if (!commentInput.value.trim() || !selectedTrackId.value) return; await fetch(`${apiBase}/tracks/${selectedTrackId.value}/comments`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ body: commentInput.value }) }); commentInput.value=''; await loadComments(); };
const deleteComment = async (id: string) => { if (!selectedTrackId.value) return; await fetch(`${apiBase}/tracks/${selectedTrackId.value}/comments/${id}`, { method:'DELETE', headers: authHeaders() }); await loadComments(); };
const toggleLike = async () => { if (!selectedTrackId.value) return; await fetch(`${apiBase}/tracks/${selectedTrackId.value}/like`, { method: likedByMe.value ? 'DELETE':'POST', headers: authHeaders() }); await loadTrackDetail(); };
const loadPlaylists = async () => { if (!token.value) return; const d = await (await fetch(`${apiBase}/playlists`, { headers: authHeaders() })).json(); playlists.value = d.playlists ?? []; if (!selectedPlaylistId.value && playlists.value[0]) selectedPlaylistId.value = playlists.value[0].id; };
const createPlaylist = async () => { if (!playlistName.value.trim()) return; await fetch(`${apiBase}/playlists`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ name: playlistName.value })}); playlistName.value=''; await loadPlaylists(); };
const renamePlaylist = async (pl: Playlist) => { const name = prompt('New name', pl.name); if (!name?.trim()) return; await fetch(`${apiBase}/playlists/${pl.id}`, { method:'PATCH', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ name })}); await loadPlaylists(); };
const deletePlaylist = async (id: string) => { await fetch(`${apiBase}/playlists/${id}`, { method:'DELETE', headers: authHeaders() }); await loadPlaylists(); };
const addSelectedTrackToPlaylist = async () => { if (!selectedPlaylistId.value || !selectedTrackId.value) return; await fetch(`${apiBase}/playlists/${selectedPlaylistId.value}/items`, { method:'POST', headers:{ 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ track_id: selectedTrackId.value })}); };
const removeTrackFromPlaylist = async (pid: string, tid: string) => { await fetch(`${apiBase}/playlists/${pid}/items/${tid}`, { method:'DELETE', headers: authHeaders() }); };
const playPlaylist = async (shuffle=false) => { if (!selectedPlaylistId.value) return; const d = await (await fetch(`${apiBase}/playlists/${selectedPlaylistId.value}/play?shuffle=${shuffle}`, { headers: authHeaders() })).json(); queue.value = d.tracks ?? []; await playAt(0); };

watch(selectedTrackId, async () => { await loadTrackDetail(); await loadComments(); });
onMounted(async () => { audio.value = new Audio(); audio.value.addEventListener('ended', () => { if (currentIndex.value + 1 < queue.value.length) void playAt(currentIndex.value + 1); else isPlaying.value = false;}); await loadMe(); await loadTracks(); await loadPlaylists(); await loadTrackDetail(); await loadComments();});
</script>

<template>
  <main class="mx-auto max-w-6xl p-6 space-y-6">
    <h1 class="text-3xl font-bold">Music Core MVP</h1>
    <input v-model="token" @change="localStorage.setItem('token', token)" class="w-full rounded border p-2" placeholder="JWT token" />
    <p class="text-sm">Logged in as {{ me?.display_name ?? 'guest' }} ({{ me?.role ?? 'guest' }})</p>

    <section class="rounded border p-4">
      <h2 class="font-semibold mb-2">Tracks</h2>
      <div class="grid gap-2">
        <button v-for="(track, i) in tracks" :key="track.id" class="text-left rounded border p-2" @click="selectedTrackId = track.id; playAt(i)">{{ track.title }}</button>
      </div>
    </section>

    <section class="rounded border p-4 space-y-2">
      <h2 class="font-semibold">Playlist Page</h2>
      <div class="flex gap-2">
        <input v-model="playlistName" class="rounded border p-2" placeholder="New playlist name" />
        <button class="rounded bg-black px-3 py-1 text-white" @click="createPlaylist">Create</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button v-for="pl in playlists" :key="pl.id" class="rounded border px-3 py-1" @click="selectedPlaylistId = pl.id">{{ pl.name }}</button>
      </div>
      <div class="flex gap-2">
        <button class="rounded border px-3 py-1" @click="addSelectedTrackToPlaylist">Add selected track</button>
        <button class="rounded border px-3 py-1" @click="playPlaylist(false)">Play in order</button>
        <button class="rounded border px-3 py-1" @click="playPlaylist(true)">Play shuffled</button>
      </div>
      <div v-for="pl in playlists" :key="`${pl.id}-actions`" class="text-sm">
        <button class="mr-2 underline" @click="renamePlaylist(pl)">Rename {{ pl.name }}</button>
        <button class="mr-2 underline" @click="deletePlaylist(pl.id)">Delete</button>
        <button class="underline" @click="selectedTrackId && removeTrackFromPlaylist(pl.id, selectedTrackId)">Remove selected track</button>
      </div>
    </section>

    <section class="rounded border p-4 space-y-2">
      <h2 class="font-semibold">Track Detail</h2>
      <p>{{ selectedTrack?.title ?? 'Select a track' }}</p>
      <button class="rounded border px-3 py-1" @click="toggleLike">{{ likedByMe ? 'Unlike' : 'Like' }} ({{ likeCount }})</button>
      <div>
        <h3 class="font-medium">Comments</h3>
        <div class="flex gap-2 mb-2">
          <input v-model="commentInput" class="w-full rounded border p-2" placeholder="Add a comment" />
          <button class="rounded border px-3 py-1" @click="addComment">Post</button>
        </div>
        <ul class="space-y-2">
          <li v-for="c in comments" :key="c.id" class="rounded border p-2 text-sm">
            <p><strong>{{ c.display_name }}</strong>: {{ c.body }}</p>
            <button class="underline" @click="deleteComment(c.id)">Delete</button>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>
