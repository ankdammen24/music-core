<script setup lang="ts">
import { onMounted, ref } from 'vue';

type Track = { id: string; title: string; description: string | null; is_public: boolean; audio_file_path: string };
const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const token = ref(localStorage.getItem('token') ?? '');
const tracks = ref<Track[]>([]);
const form = ref({ title: '', description: '', audio_file_path: '', is_public: false });
const editingId = ref<string | null>(null);

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` });

const loadTracks = async () => {
  const res = await fetch(`${apiBase}/tracks`, { headers: token.value ? { Authorization: `Bearer ${token.value}` } : {} });
  const data = await res.json();
  tracks.value = data.tracks ?? [];
};

const save = async () => {
  const method = editingId.value ? 'PATCH' : 'POST';
  const url = editingId.value ? `${apiBase}/tracks/${editingId.value}` : `${apiBase}/tracks`;
  await fetch(url, { method, headers: headers(), body: JSON.stringify(form.value) });
  form.value = { title: '', description: '', audio_file_path: '', is_public: false };
  editingId.value = null;
  await loadTracks();
};

const removeTrack = async (id: string) => {
  await fetch(`${apiBase}/tracks/${id}`, { method: 'DELETE', headers: headers() });
  await loadTracks();
};

const startEdit = (track: Track) => {
  editingId.value = track.id;
  form.value = { title: track.title, description: track.description ?? '', audio_file_path: track.audio_file_path, is_public: track.is_public };
};

onMounted(loadTracks);
</script>

<template>
  <main class="mx-auto max-w-3xl p-6 space-y-6">
    <h1 class="text-3xl font-bold">Artist Dashboard</h1>
    <input v-model="token" @change="localStorage.setItem('token', token)" class="w-full rounded border p-2" placeholder="Paste JWT token" />

    <section class="rounded border p-4 space-y-3">
      <h2 class="text-xl font-semibold">{{ editingId ? 'Edit Track' : 'Add Track' }}</h2>
      <input v-model="form.title" class="w-full rounded border p-2" placeholder="Title" />
      <textarea v-model="form.description" class="w-full rounded border p-2" placeholder="Description" />
      <input v-model="form.audio_file_path" class="w-full rounded border p-2" placeholder="Audio file path (from upload endpoint)" />
      <label class="flex items-center gap-2"><input v-model="form.is_public" type="checkbox" /> Public</label>
      <button class="rounded bg-black px-4 py-2 text-white" @click="save">Save</button>
    </section>

    <section class="rounded border p-4">
      <h2 class="text-xl font-semibold mb-3">My Tracks</h2>
      <ul class="space-y-2">
        <li v-for="track in tracks" :key="track.id" class="flex items-center justify-between rounded border p-2">
          <div>
            <p class="font-medium">{{ track.title }}</p>
            <p class="text-sm text-gray-600">{{ track.description }}</p>
          </div>
          <div class="space-x-2">
            <button class="rounded border px-3 py-1" @click="startEdit(track)">Edit</button>
            <button class="rounded border px-3 py-1" @click="removeTrack(track.id)">Delete</button>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
