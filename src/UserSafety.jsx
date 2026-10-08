import { useState } from 'react';
import { api } from './api.js';
import { Modal } from './components.jsx';
export function UserSafety({ person, blocked, onClose, onChanged }) {
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [status,setStatus]=useState(''), [reason,setReason]=useState('spam'), [details,setDetails]=useState('');
  const run=async fn=>{setBusy(true);setError('');try{await fn();await onChanged?.();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <Modal title={'Block or report ' + person.name} onClose={onClose}>
    <p>Blocking stops new messages, calls, typing indicators, and doodle invitations between you. Your existing chat stays available.</p>
    <button type="button" className="secondary" disabled={busy} onClick={()=>void run(async()=>{await api('/users/'+person.id+'/block',{method:blocked?'DELETE':'PUT'});onClose();})}>{blocked?'Unblock user':'Block user'}</button>
    <form className="settings-form" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/users/'+person.id+'/report',{method:'POST',body:{reason,details}});setStatus('Report submitted.');setDetails('');});}}>
      <h3>Report user</h3><p>Your report is stored privately for review by the app operator.</p>
      <label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}>{Object.entries({spam:'Spam',harassment:'Harassment',impersonation:'Impersonation',other:'Other'}).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
      <label>Details<textarea aria-label="Report details" maxLength={2000} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Tell us what happened" /></label>
      <button className="primary" disabled={busy || !!status}>Submit report</button>
    </form>
    {status && <p role="status">{status}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </Modal>;
}
