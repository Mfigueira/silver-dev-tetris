import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the project from /<repo>/, so CI sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
})
