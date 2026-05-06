import { defineStore } from 'pinia';
export const usePlayerStore = defineStore('player', {
  state: () => ({ queue: [] as any[], currentIndex: 0, isPlaying: false, shuffle: false, repeat: 'off' as 'off'|'one'|'all' }),
  getters: { currentTrack: (s) => s.queue[s.currentIndex] },
  actions: {
    togglePlay(){ this.isPlaying=!this.isPlaying; }, next(){ if(this.repeat==='one') return; this.currentIndex=(this.currentIndex+1)%Math.max(this.queue.length,1); }, prev(){ this.currentIndex=Math.max(this.currentIndex-1,0); },
    toggleShuffle(){ this.shuffle=!this.shuffle; }, cycleRepeat(){ this.repeat=this.repeat==='off'?'one':this.repeat==='one'?'all':'off'; }
  }
});
