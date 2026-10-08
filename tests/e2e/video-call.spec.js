import { test, expect } from '@playwright/test';

async function register(page, handle) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill(handle);
  await page.getByLabel('Unique handle').fill(handle);
  await page.getByLabel('Email address').fill(`${handle}@example.test`);
  await page.getByLabel('Password').fill('a long strong password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(`@${handle}`)).toBeVisible();
}

test('two people exchange messages, files and voice notes, then make voice and video calls', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const aliceHandle = `alice_${suffix}`;
  const bobHandle = `bob_${suffix}`;
  const aliceContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const bobContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  try {
    await register(bob, bobHandle);
    await register(alice, aliceHandle);

    await alice.locator('.chat-welcome').getByRole('button', { name: 'Say hello' }).click();
    await alice.getByLabel('Friend’s handle').fill(bobHandle);
    await alice.getByRole('button', { name: 'Open our chat' }).click();
    await expect(
      bob.locator('.conversation-list').getByText(aliceHandle, { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await bob
      .locator('.conversation-list')
      .getByRole('button')
      .filter({ hasText: aliceHandle })
      .click();
    await alice.getByRole('textbox', { name: 'Message', exact: true }).fill('sughamano?');
    await alice.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(bob.locator('.message .bubble p')).toContainText('sughamano?');
    await bob.getByRole('textbox', { name: 'Message', exact: true }).fill('Niko sawa, asante!');
    await bob.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(alice.locator('.message .bubble p').last()).toContainText('Niko sawa, asante!');
    await alice.getByRole('button', { name: 'Choose sticker' }).click();
    await alice.getByRole('button', { name: 'Send hello sticker' }).click();
    await expect(bob.locator('.sticker')).toHaveText('👋');
    await alice.locator('.composer input[type=file]').setInputFiles({
      name: 'meeting-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Private meeting notes'),
    });
    await alice.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(bob.locator('.file-card strong')).toContainText('meeting-notes.txt');
    await alice.getByRole('button', { name: 'Record voice note' }).click();
    await expect(alice.locator('.recording')).toContainText('1s', { timeout: 5000 });
    await alice.getByRole('button', { name: 'Stop recording' }).click();
    await alice.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(bob.locator('audio[aria-label="Play voice note"]')).toBeVisible({
      timeout: 15000,
    });
    await expect
      .poll(() =>
        bob.locator('audio[aria-label="Play voice note"]').evaluate((audio) => audio.readyState),
      )
      .toBeGreaterThan(0);
    await alice.screenshot({ path: testInfo.outputPath('chat-desktop.png') });
    await bob.setViewportSize({ width: 390, height: 844 });
    await bob.screenshot({ path: testInfo.outputPath('chat-mobile.png') });
    await bob.setViewportSize({ width: 1280, height: 720 });

    // Exercise the track replacement with a synthetic screen, without a desktop capture picker.
    await alice.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#2d7762';
        ctx.fillRect(0, 0, 640, 360);
        return canvas.captureStream(15);
      };
    });
    await alice.getByRole('button', { name: 'Start voice call' }).click();
    const voiceIncoming = bob.getByRole('dialog', { name: 'Voice call' });
    await expect(voiceIncoming).toBeVisible({ timeout: 15000 });
    await voiceIncoming.getByRole('button', { name: 'Accept' }).click();
    await expect(
      alice.getByRole('dialog', { name: 'Voice call' }).locator('.call-info p'),
    ).toContainText('Connected', { timeout: 25000 });
    await expect(voiceIncoming.locator('.call-info p')).toContainText('Connected', {
      timeout: 25000,
    });
    await alice.getByRole('button', { name: 'Mute', exact: true }).click();
    await expect(alice.getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
    await alice.getByRole('button', { name: 'Unmute', exact: true }).click();
    await alice.getByRole('button', { name: 'Share screen', exact: true }).click();
    await expect(alice.getByRole('button', { name: 'Stop screen sharing' })).toBeVisible();
    await expect(voiceIncoming.locator('.remote-video')).not.toHaveClass(/audio-call/, {
      timeout: 15000,
    });
    await expect
      .poll(() => voiceIncoming.locator('.remote-video').evaluate((video) => video.videoWidth), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    await bob.screenshot({ path: testInfo.outputPath('screen-sharing.png') });
    await alice.getByRole('button', { name: 'Stop screen sharing' }).click();
    await alice.getByRole('button', { name: 'End call' }).click();
    await expect(voiceIncoming).toBeHidden({ timeout: 10000 });
    await alice.getByRole('button', { name: 'Start video call' }).click();
    const incoming = bob.getByRole('dialog', { name: 'Video call' });
    await expect(incoming).toBeVisible({ timeout: 15000 });
    await incoming.getByRole('button', { name: 'Accept' }).click();

    await expect(
      alice.getByRole('dialog', { name: 'Video call' }).locator('.call-info p'),
    ).toContainText('Connected', { timeout: 25000 });
    await expect(incoming.locator('.call-info p')).toContainText('Connected', { timeout: 25000 });
    await expect
      .poll(() => incoming.locator('.remote-video').evaluate((video) => video.videoWidth), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    await bob.screenshot({ path: testInfo.outputPath('video-call.png') });

    await alice.getByRole('button', { name: 'End call' }).click();
    await expect(alice.getByRole('dialog', { name: 'Video call' })).toBeHidden({ timeout: 10000 });
    await expect(bob.getByRole('dialog', { name: 'Video call' })).toBeHidden({ timeout: 10000 });
  } finally {
    await Promise.all([aliceContext.close(), bobContext.close()]);
  }
});
