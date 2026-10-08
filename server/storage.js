import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import net from 'node:net';
import { fileTypeFromBuffer } from 'file-type';
import { config, production } from './config.js';
import { HttpError, safeName } from './security.js';
const options = {
  region: config.S3_REGION,
  forcePathStyle: !!config.S3_ENDPOINT,
  credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
};
const s3 = new S3Client({ ...options, endpoint: config.S3_ENDPOINT });
const publicS3 = new S3Client({
  ...options,
  endpoint: config.S3_PUBLIC_ENDPOINT || config.S3_ENDPOINT,
});
const allowed = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/opus',
  'audio/mp4',
  'audio/x-m4a',
  'video/webm',
  'audio/webm',
  'video/mp4',
]);
export async function inspectFile(file, purpose) {
  if (!file?.buffer?.length) throw new HttpError(400, 'Choose a non-empty file.');
  if (file.size > 25 * 1024 * 1024) throw new HttpError(413, 'Files must be smaller than 25 MB.');
  const type = await fileTypeFromBuffer(file.buffer);
  let mime = type?.mime;
  if (!mime && /\.txt$/i.test(file.originalname)) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
      if (!text.includes('\0')) mime = 'text/plain';
    } catch {
      /* binary text is rejected */
    }
  }
  if (!allowed.has(mime) && mime !== 'text/plain')
    throw new HttpError(
      415,
      'Supported: images, PDF, modern Office documents, plain text, audio, and MP4/WebM.',
    );
  if (purpose === 'avatar' && !['image/jpeg', 'image/png'].includes(mime))
    throw new HttpError(415, 'Profile photos must be JPG or PNG.');
  if (
    purpose === 'voice' &&
    !['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/opus', 'audio/webm', 'video/webm'].includes(mime)
  )
    throw new HttpError(415, 'Voice samples must be MP3, WAV, OGG, or WebM.');
  await scan(file.buffer);
  return { mime, ext: type?.ext || 'txt', name: safeName(file.originalname) };
}
export async function scan(buffer) {
  if (config.SKIP_VIRUS_SCAN && !production) return;
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.CLAMAV_HOST, port: config.CLAMAV_PORT });
    let response = '';
    socket.setTimeout(60000);
    socket.on('timeout', () => socket.destroy(new Error('Scanner timeout')));
    socket.on('error', () =>
      reject(new HttpError(503, 'File scanner unavailable. Please retry later.')),
    );
    socket.on('data', (chunk) => {
      response += chunk.toString();
      if (response.length > 4096) socket.destroy(new Error('Scanner response too large'));
    });
    socket.on('end', () =>
      response.includes('stream: OK')
        ? resolve()
        : reject(new HttpError(422, 'File rejected by security scanner.')),
    );
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let i = 0; i < buffer.length; i += 65536) {
        const chunk = buffer.subarray(i, i + 65536);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length);
        socket.write(header);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}
export const putObject = (key, body, mime) =>
  s3.send(
    new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: body, ContentType: mime }),
  );
export const removeObject = (key) =>
  s3.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
export const readObject = async (key) =>
  (
    await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }))
  ).Body.transformToByteArray();
export const getObject = (key, range) =>
  s3.send(
    new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ...(range ? { Range: range } : {}),
    }),
  );
export const storageReady = () => s3.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
export const signedObject = (key, name, mime, expiresIn = 300) =>
  getSignedUrl(
    publicS3,
    new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ResponseContentType: mime,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(safeName(name))}`,
    }),
    { expiresIn },
  );
export const providerObject = (key) =>
  getSignedUrl(publicS3, new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }), {
    expiresIn: 3600,
  });
