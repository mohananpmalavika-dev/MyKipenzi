import { useState } from 'react';
import { expiryOptions } from '../shared/disappearing.js';
import { api } from './api.js';
import { Modal } from './components.jsx';
export function DisappearingSettings({ conversation, onClose, onChanged, onError }) {
 const [busy,setBusy]=useState(false);
 return <Modal title="Disappearing messages" onClose={onClose}>
 <p>New messages disappear after the selected time, starting when they are sent. Existing messages keep their original expiry. Stars and pins do not prevent expiry.</p>
 <label>Message expiry<select aria-label="Message expiry" value={conversation.disappearing_seconds || 0} disabled={busy || (conversation.is_group && !conversation.is_admin)} onChange={async e=>{const seconds=Number(e.target.value);setBusy(true);try{await api('/conversations/'+conversation.id+'/disappearing',{method:'PATCH',body:{seconds}});await onChanged();}catch(error){onError(error.message);}finally{setBusy(false);}}}>{Object.entries(expiryOptions).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
 {conversation.is_group && !conversation.is_admin && <p>Only group admins can change this setting.</p>}
 </Modal>;
}
