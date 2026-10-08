let csrf = null;
export function setCsrf(value) {
  csrf = value;
}
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    signal: AbortSignal.timeout(options.body instanceof FormData ? 120000 : 30000),
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...options.headers,
    },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('The service could not be reached. Please retry.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export async function fileBlob(id) {
  const { url } = await api(`/attachments/${id}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error('File download failed.');
  return response.blob();
}
export async function downloadFile(attachment) {
  const blob = await fileBlob(attachment.id),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = attachment.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
