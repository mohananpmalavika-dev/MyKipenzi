import { readFile, appendFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import webpush from 'web-push';

const file = new URL('../.env', import.meta.url);
const values = dotenv.parse(await readFile(file, 'utf8'));
if (Boolean(values.VAPID_PUBLIC_KEY) !== Boolean(values.VAPID_PRIVATE_KEY))
  throw new Error('The local push key pair is incomplete. Restore both keys before continuing.');
if (!values.VAPID_PUBLIC_KEY) {
  const keys = webpush.generateVAPIDKeys();
  await appendFile(file, `\n# Background message notifications\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`);
}
console.log('Local background-notification keys are ready. Restart the local API and worker. Nothing was deployed.');
