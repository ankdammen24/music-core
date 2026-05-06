<script setup lang="ts">
import { computed, ref } from 'vue';
const api = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const token = ref(localStorage.getItem('token') ?? '');
const page = ref<'login'|'register'|'tracks'|'dashboard'|'upload'|'player'>('login');
const tracks = ref<any[]>([]); const me = ref<any>(null); const selected = ref(0); const audio = ref<HTMLAudioElement|null>(null);
const form = ref({email:'',password:'',displayName:'',role:'listener'}); const msg = ref('');
const headers = (): Record<string,string> => token.value ? { Authorization: `Bearer ${token.value}` } : {};
const loadMe=async()=>{ if(!token.value) return; const r=await fetch(`${api}/auth/me`,{headers:headers()}); if(r.ok) me.value=(await r.json()).user;};
const loadTracks=async()=>{ const d=await (await fetch(`${api}/tracks`)).json(); tracks.value=d.tracks||[];};
const auth=async(kind:'login'|'register')=>{ const body=kind==='login'?{email:form.value.email,password:form.value.password}:form.value; const r=await fetch(`${api}/auth/${kind}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(r.ok){token.value=d.token;localStorage.setItem('token',token.value);await loadMe();page.value='tracks';} else msg.value=d.message||d.error||'failed';};
const streamUrl = computed(()=> tracks.value[selected.value]?`${api}/tracks/${tracks.value[selected.value].id}/stream`:'');
const doUpload = async (e: Event)=>{ const t=e.target as HTMLFormElement; const f=(t.elements.namedItem('file') as HTMLInputElement).files?.[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); const r=await fetch(`${api}/tracks/upload`,{method:'POST',headers:headers(),body:fd}); msg.value=r.ok?'uploaded & normalized':(await r.json()).error; await loadTracks(); };
loadTracks(); loadMe();
</script>
<template>
<main class="p-3 max-w-4xl mx-auto pb-28">
  <h1 class="text-2xl font-bold mb-2">Music Core v0.1-alpha</h1>
  <nav class="grid grid-cols-3 md:flex gap-2 mb-3 text-sm">
    <button class="btn" @click="page='login'">Login</button><button class="btn" @click="page='register'">Register</button><button class="btn" @click="page='tracks'">Tracks</button>
    <button class="btn" v-if="me?.role==='artist'" @click="page='dashboard'">Artist Dashboard</button><button class="btn" v-if="me?.role==='artist'" @click="page='upload'">Upload</button><button class="btn" @click="page='player'">Player</button>
  </nav>
  <p class="text-red-300">{{ msg }}</p>
  <section v-if="page==='login'||page==='register'" class="card"><input v-model="form.email" placeholder="email" class="inp"/><input v-model="form.password" type="password" placeholder="password" class="inp"/><input v-if="page==='register'" v-model="form.displayName" placeholder="display name" class="inp"/><select v-if="page==='register'" v-model="form.role" class="inp"><option>listener</option><option>artist</option></select><button class="btn w-full py-3" @click="auth(page)">{{page}}</button></section>
  <section v-if="page==='tracks'" class="card"><div v-for="(t,i) in tracks" :key="t.id" class="border p-2 rounded mb-2" @click="selected=i"><p class="font-semibold">{{t.title}}</p><p>{{t.artist_name}} • {{t.normalization_status}}</p></div></section>
  <section v-if="page==='dashboard'" class="card"><div v-for="t in tracks" :key="t.id" class="border p-2 rounded mb-2"><p>{{t.title}}</p><p>Status: {{t.normalization_status}} | LUFS {{t.integrated_loudness_lufs}} | TP {{t.true_peak_dbtp}}</p><p>Playable: {{t.normalization_status==='ready'?'yes':'no'}}</p></div></section>
  <form v-if="page==='upload'" class="card" @submit.prevent="doUpload"><input name="file" type="file" accept="audio/*" class="inp"/><button class="btn w-full py-3">Upload Track</button></form>
  <section v-if="page==='player'" class="card"><audio ref="audio" :src="streamUrl" controls class="w-full"/></section>
  <div class="fixed bottom-0 left-0 right-0 bg-slate-900 border-t p-3 md:hidden">
    <p class="text-sm truncate">{{tracks[selected]?.title || 'No track selected'}}</p>
    <div class="grid grid-cols-5 gap-2 mt-2"><button class="btn" @click="selected=Math.max(0,selected-1)">Prev</button><button class="btn" @click="audio?.play()">Play</button><button class="btn" @click="audio?.pause()">Pause</button><button class="btn" @click="selected=(selected+1)%Math.max(1,tracks.length)">Next</button><button class="btn">Shuffle</button></div>
  </div>
</main>
</template>
