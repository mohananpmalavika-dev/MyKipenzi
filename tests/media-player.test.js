import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

test('media controls update playback, seek markers, volume and decoded waveform', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  server.middlewares.use('/player-test', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const { MediaPlayer } = await import('/src/MediaPlayer.jsx');
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      const { createRoot } = ReactDOM;
      const samples = 8000 * 4;
      const bytes = new ArrayBuffer(44 + samples * 2), view = new DataView(bytes);
      const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
      text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
      text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true);
      for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.sin(i * 0.3) * 16000, true);
      const src = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      createRoot(document.getElementById('root')).render(React.createElement(MediaPlayer, { src }));
    </script>`);
  });
  // Serve the fixture before Vite's application HTML fallback.
  server.middlewares.stack.unshift(server.middlewares.stack.pop());
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/player-test`);
    await page.getByRole('img', { name: 'Voice note waveform' }).waitFor();
    assert.equal(await page.locator('svg rect').count(), 64);
    for (const speed of ['0.5', '1', '1.5', '2']) {
      await page.getByLabel('Playback speed').selectOption(speed);
      assert.equal(await page.locator('audio').evaluate((audio) => audio.playbackRate), Number(speed));
    }
    await page.getByRole('button', { name: 'Seek to 0:02', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate((audio) => audio.currentTime), 2);
    await page.getByLabel('Media volume', { exact: true }).fill('0.4');
    assert.equal(await page.locator('audio').evaluate((audio) => audio.volume), 0.4);
    await page.getByRole('button', { name: 'Mute media', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate((audio) => audio.muted), true);
    await page.getByRole('button', { name: 'Unmute media', exact: true }).click();
    await page.getByRole('button', { name: 'Play media', exact: true }).click();
    await page.getByRole('button', { name: 'Pause media', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate((audio) => audio.paused), true);
  } finally {
    await browser?.close();
    await server.close();
  }
});
