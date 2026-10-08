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
export async function fileBlob(id, signal) {
  const { url } = await api(`/attachments/${id}`, signal ? { signal } : {});
  const response = await fetch(url, { signal });
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

export function uploadFile(path, body, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api' + path);
    request.timeout = 120000;
    if (csrf) request.setRequestHeader('x-csrf-token', csrf);
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    request.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    request.ontimeout = () => reject(new Error('Upload timed out. Please retry.'));
    request.onabort = () => reject(new Error('Upload cancelled.'));
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300) throw new Error(data.error || 'Upload failed. Please retry.');
        resolve(data);
      } catch (error) { reject(error instanceof SyntaxError ? new Error('The service could not be reached. Please retry.') : error); }
    };
    onProgress(0);
    request.send(body);
  });
}
