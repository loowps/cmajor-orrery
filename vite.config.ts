import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssCodeSplit: false,
    minify: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: 'src/main.ts',
      output: {
        entryFileNames: `main.js`
      }
    }
  },
  plugins: [vue(), cssInjectedByJsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
