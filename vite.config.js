import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import featureLocalePlugin from './scripts/feature-locale-plugin.mjs';

function offlinePwa() {
  const modules = ['offline-store.js', 'offline-sync.js', 'lockPrivacy.js'];
  return {
    name: 'kipenzi-offline-pwa',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split('?')[0].slice(1);
        if (!modules.includes(name)) return next();
        response.setHeader('Content-Type', 'text/javascript');
        response.end(readFileSync(new URL(`./shared/${name}`, import.meta.url), 'utf8'));
      });
    },
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => !name.endsWith('.map'));
      const revision = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 12);
      for (const name of modules) this.emitFile({ type: 'asset', fileName: name, source: readFileSync(new URL(`./shared/${name}`, import.meta.url), 'utf8') });
      const source = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8')
        .replace("'kipenzi-shell-v2'", `'kipenzi-shell-${revision}'`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', ...assets.map(name => '/' + name)])};`);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
export default defineConfig({
  plugins: [react({ babel: { plugins: [featureLocalePlugin] } }), offlinePwa()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/socket.io': { target: 'http://127.0.0.1:3001', ws: true },
    },
  },
  build: { outDir: 'dist' },
});
