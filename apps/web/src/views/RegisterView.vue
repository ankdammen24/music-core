<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ api: string }>()
const emit = defineEmits<{
  'logged-in': [token: string]
  'go-login': []
}>()

const form = ref({ email: '', password: '', displayName: '', role: 'listener' })
const error = ref('')
const loading = ref(false)

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    const r = await fetch(`${props.api}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    const d = await r.json()
    if (r.ok) emit('logged-in', d.token)
    else error.value = d.message ?? d.error ?? 'Registrering misslyckades'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-full p-6">
    <div class="w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-8">Registrera dig</h2>

      <div class="flex flex-col gap-3">
        <input v-model="form.email" type="email" placeholder="E-post" class="inp" />
        <input v-model="form.password" type="password" placeholder="Lösenord" class="inp" />
        <input v-model="form.displayName" placeholder="Visningsnamn" class="inp" />
        <select v-model="form.role" class="inp">
          <option value="listener">Lyssnare</option>
          <option value="artist">Artist</option>
        </select>
        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
        <button class="btn-primary" :disabled="loading" @click="submit">
          {{ loading ? 'Registrerar...' : 'Skapa konto' }}
        </button>
        <button class="text-sm text-zinc-400 hover:text-white" @click="emit('go-login')">
          Har du redan ett konto? Logga in
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inp { @apply w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500; }
.btn-primary { @apply w-full bg-white text-zinc-900 font-semibold py-2 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50; }
</style>
