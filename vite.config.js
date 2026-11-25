import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Static output only — same deploy model as the current single-file app
// (GitHub Pages today, Cloudflare Pages once this port is validated).
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // the avatar generator is a deliberately lazy ~830 KB chunk
    chunkSizeWarningLimit: 900
  }
});
