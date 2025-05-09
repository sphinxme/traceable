import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({

  plugins: [svelte()],

  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      "@": path.resolve("./src"),
    },
  },
})
