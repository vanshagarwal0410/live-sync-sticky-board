/**
 * vite.config.js — Vite build configuration for the Sticky Board client.
 *
 * Standard React setup. The VITE_WS_URL environment variable (set in .env
 * files) gets baked into the production bundle at build time — that's how
 * the client knows where the WebSocket server lives.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
