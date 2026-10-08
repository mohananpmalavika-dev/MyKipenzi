import { useEffect, useRef, useState } from 'react';
import { api, fileBlob } from './api.js';
import { Modal } from './components.jsx';
import { attachmentPath, conversationText, exportName, zipArchive } from '../shared/chatExport.js';

export function ChatExport({ conversationId, title, onClose }) {
  const [includeAttachments,setIncludeAttachments] = useState(true);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [error,setError] = useState('');
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => { controller.current?.abort(); onClose(); };
  const download = async () => {
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setBusy(true); setError(''); setStatus('Reading conversation…');
    try {
      let after = '0', through, more = true, messages = [];
      while (more) {
        const query = new URLSearchParams({after,...(through ? {through} : {})});
        const result = await api('/conversations/' + conversationId + '/export?' + query,{signal});
        messages.push(...result.messages); through = result.through; more = result.has_more;
        if (more && !result.messages.length) throw new Error('Export could not continue. Please retry.');
        if (result.messages.length) after = result.messages.at(-1).seq;
        setStatus('Read ' + messages.length + ' messages…');
      }
      messages = messages.filter(message => !message.expires_at || new Date(message.expires_at).getTime() > Date.now());
      const attachments = [...new Map(messages.filter(message => message.attachment).map(message => [message.attachment.id,message.attachment])).values()];
      const maxBytes = 250 * 1024 * 1024;
      if (includeAttachments && attachments.reduce((sum,item) => sum + item.size,0) > maxBytes) throw new Error('Attachments exceed the 250 MB export limit. Choose text only.');
      const text = new TextEncoder().encode(conversationText(title,messages,includeAttachments));
      const entries = [{name:'conversation.txt',bytes:text}];
      let total = text.length;
      if (includeAttachments) {
        for (let index=0;index<attachments.length;index++) {
          const attachment = attachments[index];
          setStatus('Downloading attachment ' + (index+1) + ' of ' + attachments.length + '…');
          const blob = await fileBlob(attachment.id,signal);
          total += blob.size;
          if (total > maxBytes) throw new Error('Export exceeds 250 MB. Choose text only.');
          entries.push({name:attachmentPath(attachment),bytes:new Uint8Array(await blob.arrayBuffer())});
        }
      }
      signal.throwIfAborted();
      setStatus('Preparing download…');
      const blob = includeAttachments ? zipArchive(entries) : new Blob([text],{type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = exportName(title) + '-' + new Date().toISOString().slice(0,10) + (includeAttachments ? '.zip' : '.txt');
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000);
      setStatus('Download ready.');
    } catch (err) { if (!signal.aborted) { setError(err.message); setStatus(''); } }
    finally { if (!signal.aborted) setBusy(false); }
  };
  return <Modal title="Export chat" onClose={close}>
    <p>Download the full available conversation as UTF-8 text, with photos, voice notes, and files in a ZIP.</p>
    <p>Deleted and expired messages are excluded. Downloaded copies stay on your device even if messages later disappear.</p>
    <label className="export-attachments"><input type="checkbox" checked={includeAttachments} disabled={busy} onChange={event => setIncludeAttachments(event.target.checked)} /> Include attachments (up to 250 MB)</label>
    {error && <p role="alert">{error}</p>}
    {status && <p role="status" aria-live="polite">{status}</p>}
    <div className="export-actions"><button type="button" className="primary" disabled={busy} onClick={() => void download()}>{busy ? 'Exporting…' : error ? 'Retry export' : includeAttachments ? 'Download ZIP' : 'Download text'}</button><button type="button" className="secondary" onClick={close}>{busy ? 'Cancel export' : 'Close'}</button></div>
  </Modal>;
}
