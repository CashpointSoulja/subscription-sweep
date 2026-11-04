import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The local production preview sends the same security headers as the live site (from vercel.json),
// so the QA run tests the real Content-Security-Policy, not a looser one.
const live = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const previewHeaders = Object.fromEntries(live.headers.find(h => h.source === '/(.*)')!.headers.map(h => [h.key, h.value]));

export default defineConfig({ plugins: [react()], base: './', preview: { headers: previewHeaders } });
