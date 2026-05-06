<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

type Track = { id: string; title: string; artist_id: string; stream_url: string };
type Comment = { id: string; user_id: string; display_name: string; body: string; created_at: string; track_title?: string; track_id?: string };
type Profile = { id: string; display_name: string; role: 'listener' | 'artist' | 'admin' };
type AdminUser = { id: string; email: string; display_name: string; role: string };

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const token = ref(localStorage.getItem('token') ?? '');
const me = ref<Profile | null>(null);
const page = ref<'player' | 'artist-stats' | 'admin-users' | 'admin-moderation'>('player');
const tracks = ref<Track[]>([]);
const selectedTrackId = ref('');
const comments = ref<Comment[]>([]);
const artistStats = ref<any>(null);
const adminUsers = ref<AdminUser[]>([]);
const adminTracks = ref<any[]>([]);
const adminComments = ref<Comment[]>([]);

const authHeaders = (): Record<string, string> => (token.value ? { Authorization: `Bearer ${token.value}` } : {});
const selectedTrack = computed(() => tracks.value.find((t) => t.id === selectedTrackId.value));

const loadMe = async () => { if (!token.value) return (me.value = null); const r = await fetch(`${apiBase}/auth/me`, { headers: authHeaders() }); me.value = r.ok ? (await r.json()).user : null; };
const loadTracks = async () => { const d = await (await fetch(`${apiBase}/tracks`, { headers: authHeaders() })).json(); tracks.value = d.tracks ?? []; if (!selectedTrackId.value && tracks.value[0]) selectedTrackId.value = tracks.value[0].id; };
const loadComments = async () => { if (!selectedTrackId.value) return; const d = await (await fetch(`${apiBase}/tracks/${selectedTrackId.value}/comments`, { headers: authHeaders() })).json(); comments.value = d.comments ?? []; };
const loadArtistStats = async () => { const r = await fetch(`${apiBase}/artist/stats`, { headers: authHeaders() }); artistStats.value = r.ok ? await r.json() : null; };
const loadAdminUsers = async () => { const d = await (await fetch(`${apiBase}/admin/users`, { headers: authHeaders() })).json(); adminUsers.value = d.users ?? []; };
const loadAdminTracks = async () => { const d = await (await fetch(`${apiBase}/admin/tracks`, { headers: authHeaders() })).json(); adminTracks.value = d.tracks ?? []; };
const loadAdminComments = async () => { const d = await (await fetch(`${apiBase}/admin/comments`, { headers: authHeaders() })).json(); adminComments.value = d.comments ?? []; };

const refreshPageData = async () => {
  if (page.value === 'artist-stats' && me.value?.role === 'artist') await loadArtistStats();
  if ((page.value === 'admin-users' || page.value === 'admin-moderation') && me.value?.role === 'admin') {
    await loadAdminUsers();
    await loadAdminTracks();
    await loadAdminComments();
  }
};

const updateUserRole = async (id: string, role: string) => {
  await fetch(`${apiBase}/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ role }) });
  await loadAdminUsers();
};
const deleteAdminTrack = async (id: string) => { await fetch(`${apiBase}/admin/tracks/${id}`, { method: 'DELETE', headers: authHeaders() }); await loadAdminTracks(); };
const deleteAdminComment = async (id: string) => { await fetch(`${apiBase}/admin/comments/${id}`, { method: 'DELETE', headers: authHeaders() }); await loadAdminComments(); };

const persistToken = async () => { localStorage.setItem('token', token.value); await loadMe(); await refreshPageData(); };

watch(selectedTrackId, loadComments);
watch(page, refreshPageData);
onMounted(async () => { await loadMe(); await loadTracks(); await loadComments(); await refreshPageData(); });
</script>

<template>
  <main class="mx-auto max-w-6xl p-6 space-y-6">
    <h1 class="text-3xl font-bold">Music Core MVP</h1>
    <input v-model="token" @change="persistToken" class="w-full rounded border p-2" placeholder="JWT token" />
    <p>Logged in: {{ me?.display_name ?? 'guest' }} ({{ me?.role ?? 'guest' }})</p>

    <div class="flex gap-2 flex-wrap">
      <button class="rounded border px-3 py-1" @click="page = 'player'">Player</button>
      <button v-if="me?.role === 'artist'" class="rounded border px-3 py-1" @click="page = 'artist-stats'">Artist stats</button>
      <button v-if="me?.role === 'admin'" class="rounded border px-3 py-1" @click="page = 'admin-users'">Admin users</button>
      <button v-if="me?.role === 'admin'" class="rounded border px-3 py-1" @click="page = 'admin-moderation'">Admin moderation</button>
    </div>

    <section v-if="page === 'player'" class="rounded border p-4 space-y-3">
      <h2 class="font-semibold">Tracks</h2>
      <div class="grid gap-2">
        <button v-for="track in tracks" :key="track.id" class="text-left rounded border p-2" @click="selectedTrackId = track.id">{{ track.title }}</button>
      </div>
      <h3 class="font-semibold">Comments for {{ selectedTrack?.title }}</h3>
      <ul class="space-y-2">
        <li v-for="c in comments" :key="c.id" class="rounded border p-2">{{ c.display_name }}: {{ c.body }}</li>
      </ul>
    </section>

    <section v-if="page === 'artist-stats'" class="rounded border p-4 space-y-3">
      <h2 class="font-semibold">Artist stats page</h2>
      <p>Total tracks: {{ artistStats?.totals?.total_tracks ?? 0 }}</p>
      <p>Total plays: {{ artistStats?.totals?.total_plays ?? 0 }}</p>
      <p>Total likes: {{ artistStats?.totals?.total_likes ?? 0 }}</p>
      <p>Total comments: {{ artistStats?.totals?.total_comments ?? 0 }}</p>
      <h3 class="font-medium">Top 10 tracks by plays</h3>
      <ul><li v-for="t in artistStats?.top_tracks ?? []" :key="t.id">{{ t.title }} — {{ t.plays }} plays</li></ul>
      <h3 class="font-medium">Latest comments</h3>
      <ul><li v-for="c in artistStats?.latest_comments ?? []" :key="c.id">{{ c.display_name }} on {{ c.track_title }}: {{ c.body }}</li></ul>
    </section>

    <section v-if="page === 'admin-users'" class="rounded border p-4 space-y-3">
      <h2 class="font-semibold">Admin user list</h2>
      <div v-for="u in adminUsers" :key="u.id" class="rounded border p-2 flex items-center justify-between gap-2">
        <p>{{ u.display_name }} ({{ u.email }}) — {{ u.role }}</p>
        <select :value="u.role" @change="updateUserRole(u.id, ($event.target as HTMLSelectElement).value)" class="border rounded p-1">
          <option>listener</option><option>artist</option><option>admin</option>
        </select>
      </div>
    </section>

    <section v-if="page === 'admin-moderation'" class="rounded border p-4 space-y-3">
      <h2 class="font-semibold">Admin dashboard / moderation page</h2>
      <h3 class="font-medium">Tracks</h3>
      <div v-for="t in adminTracks" :key="t.id" class="flex justify-between border rounded p-2"><span>{{ t.title }} by {{ t.artist_name }}</span><button class="underline" @click="deleteAdminTrack(t.id)">Delete</button></div>
      <h3 class="font-medium">Comments</h3>
      <div v-for="c in adminComments" :key="c.id" class="flex justify-between border rounded p-2"><span>{{ c.display_name }} on {{ c.track_title }}: {{ c.body }}</span><button class="underline" @click="deleteAdminComment(c.id)">Delete</button></div>
    </section>
  </main>
</template>
