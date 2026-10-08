// Group Management Components
import { useState } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  UserMinus, 
  LogOut, 
  Link as LinkIcon, 
  Copy, 
  Trash2, 
  Edit2, 
  Crown,
  Settings as SettingsIcon,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Bell,
  BellOff,
} from 'lucide-react';
import { Avatar, ButtonIcon, Modal } from './components.jsx';
import { api } from './api.js';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export function GroupSettingsModal({ conversation, user, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupDetails, setGroupDetails] = useState(null);
  const [inviteLinks, setInviteLinks] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: conversation.name || '',
    description: conversation.description || '',
  });

  const isAdmin = conversation.is_admin;
  const isMuted = conversation.muted;

  const loadGroupDetails = async () => {
    try {
      const data = await api(`/conversations/${conversation.id}/details`);
      setGroupDetails(data);
      setFormData({ name: data.name, description: data.description || '' });
    } catch (e) {
      setError(e.message);
    }
  };

  const loadInviteLinks = async () => {
    if (!isAdmin) return;
    try {
      const data = await api(`/conversations/${conversation.id}/invites`);
      setInviteLinks(data.invites || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadJoinRequests = async () => {
    if (!isAdmin) return;
    try {
      const data = await api(`/conversations/${conversation.id}/join-requests`);
      setJoinRequests(data.requests || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api(`/conversations/${conversation.id}/profile`, {
        method: 'PATCH',
        body: formData,
      });
      setSuccess('Group updated successfully!');
      setEditingInfo(false);
      await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const handle = e.target.handle.value.trim().replace(/^@/, '');
    try {
      await api(`/conversations/${conversation.id}/members`, {
        method: 'POST',
        body: { handle },
      });
      setSuccess('Member added successfully!');
      e.target.reset();
      await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/members/${userId}`, { method: 'DELETE' });
      setSuccess('Member removed successfully!');
      await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group? You cannot undo this action.')) return;
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/leave`, { method: 'POST' });
      onUpdate?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId) => {
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/members/${userId}/promote`, { method: 'POST' });
      setSuccess('Member promoted to admin!');
      await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteFromAdmin = async (userId) => {
    if (!confirm('Remove admin privileges from this member?')) return;
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/members/${userId}/demote`, { method: 'POST' });
      setSuccess('Admin privileges removed!');
      await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMute = async () => {
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/mute`, {
        method: 'PATCH',
        body: { muted: !isMuted },
      });
      setSuccess(isMuted ? 'Group unmuted!' : 'Group muted!');
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInviteLink = async () => {
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/invites`, {
        method: 'POST',
        body: { expires_in_days: 7 },
      });
      setSuccess('Invite link created!');
      await loadInviteLinks();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInviteLink = async (inviteId) => {
    if (!confirm('Revoke this invite link?')) return;
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/invites/${inviteId}`, { method: 'DELETE' });
      setSuccess('Invite link revoked!');
      await loadInviteLinks();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = (code) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invite link copied to clipboard!');
  };

  const handleJoinRequest = async (requestId, action) => {
    setLoading(true);
    setError('');
    try {
      await api(`/conversations/${conversation.id}/join-requests/${requestId}`, {
        method: 'POST',
        body: { action },
      });
      setSuccess(action === 'approve' ? 'Member approved!' : 'Request rejected!');
      await loadJoinRequests();
      if (action === 'approve') await loadGroupDetails();
      onUpdate?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} className="group-settings-modal">
      <div className="modal-header">
        <h2>
          <Users size={24} />
          Group Settings
        </h2>
        <ButtonIcon icon={X} onClick={onClose} label="Close" />
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <Check size={18} />
          {success}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => {
            setActiveTab('info');
            loadGroupDetails();
          }}
        >
          <SettingsIcon size={18} />
          Info
        </button>
        <button
          className={activeTab === 'members' ? 'active' : ''}
          onClick={() => {
            setActiveTab('members');
            loadGroupDetails();
          }}
        >
          <Users size={18} />
          Members
        </button>
        {isAdmin && (
          <>
            <button
              className={activeTab === 'invites' ? 'active' : ''}
              onClick={() => {
                setActiveTab('invites');
                loadInviteLinks();
              }}
            >
              <LinkIcon size={18} />
              Invites
            </button>
            <button
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => {
                setActiveTab('requests');
                loadJoinRequests();
              }}
            >
              <UserPlus size={18} />
              Requests {joinRequests.length > 0 && `(${joinRequests.length})`}
            </button>
          </>
        )}
      </div>

      <div className="modal-body">
        {activeTab === 'info' && (
          <div className="group-info-tab">
            {!editingInfo ? (
              <>
                <div className="group-info-display">
                  <div className="group-avatar-section">
                    <Avatar user={{ name: conversation.name, avatar_id: conversation.avatar_id }} size={80} />
                    {isAdmin && <button className="btn-secondary btn-sm">Change Photo</button>}
                  </div>
                  <div className="info-item">
                    <label>Group Name</label>
                    <p>{conversation.name}</p>
                  </div>
                  {groupDetails?.description && (
                    <div className="info-item">
                      <label>Description</label>
                      <p>{groupDetails.description}</p>
                    </div>
                  )}
                  <div className="info-item">
                    <label>Members</label>
                    <p>{groupDetails?.member_count || conversation.members?.length || 0}</p>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <p>{formatDate(groupDetails?.created_at)}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button className="btn-primary" onClick={() => setEditingInfo(true)}>
                    <Edit2 size={18} />
                    Edit Group Info
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Group Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={500}
                    rows={4}
                    placeholder="Add a group description..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingInfo(false);
                      setFormData({ name: conversation.name, description: conversation.description || '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="group-actions">
              <button className="btn-secondary" onClick={handleToggleMute}>
                {isMuted ? <Bell size={18} /> : <BellOff size={18} />}
                {isMuted ? 'Unmute Group' : 'Mute Group'}
              </button>
              <button className="btn-danger" onClick={handleLeaveGroup}>
                <LogOut size={18} />
                Leave Group
              </button>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="group-members-tab">
            {isAdmin && (
              <form onSubmit={handleAddMember} className="add-member-form">
                <input
                  type="text"
                  name="handle"
                  placeholder="@username"
                  required
                  pattern="[a-z0-9_]{3,30}"
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  <UserPlus size={18} />
                  Add Member
                </button>
              </form>
            )}

            {groupDetails?.members && (
              <div className="members-list">
                {groupDetails.members.map((member) => (
                  <div key={member.id} className="member-item">
                    <Avatar user={member} size={40} />
                    <div className="member-info">
                      <div className="member-name">
                        {member.name}
                        {member.is_admin && (
                          <span className="admin-badge">
                            <Crown size={14} />
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="member-handle">@{member.handle}</div>
                      {member.joined_at && (
                        <div className="member-joined">Joined {formatDate(member.joined_at)}</div>
                      )}
                    </div>
                    {isAdmin && member.id !== user.id && (
                      <div className="member-actions">
                        {!member.is_admin ? (
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => handlePromoteToAdmin(member.id)}
                            title="Make Admin"
                          >
                            <Shield size={16} />
                          </button>
                        ) : (
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => handleDemoteFromAdmin(member.id)}
                            title="Remove Admin"
                          >
                            <Shield size={16} />
                          </button>
                        )}
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove Member"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && isAdmin && (
          <div className="group-invites-tab">
            <button className="btn-primary" onClick={handleCreateInviteLink} disabled={loading}>
              <LinkIcon size={18} />
              Create Invite Link
            </button>

            {inviteLinks.length > 0 && (
              <div className="invites-list">
                {inviteLinks.map((invite) => (
                  <div key={invite.id} className="invite-item">
                    <div className="invite-info">
                      <div className="invite-code">
                        {window.location.origin}/join/{invite.code}
                      </div>
                      <div className="invite-stats">
                        Uses: {invite.use_count}
                        {invite.max_uses && ` / ${invite.max_uses}`}
                        {invite.expires_at && ` · Expires: ${formatDate(invite.expires_at)}`}
                      </div>
                    </div>
                    <div className="invite-actions">
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => handleCopyInviteLink(invite.code)}
                        title="Copy Link"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleRevokeInviteLink(invite.id)}
                        title="Revoke Link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && isAdmin && (
          <div className="group-requests-tab">
            {joinRequests.length === 0 ? (
              <div className="empty-state">
                <UserPlus size={48} />
                <p>No pending join requests</p>
              </div>
            ) : (
              <div className="requests-list">
                {joinRequests.map((request) => (
                  <div key={request.id} className="request-item">
                    <Avatar user={request} size={40} />
                    <div className="request-info">
                      <div className="request-name">{request.name}</div>
                      <div className="request-handle">@{request.handle}</div>
                      <div className="request-date">Requested {formatDate(request.created_at)}</div>
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-sm btn-success"
                        onClick={() => handleJoinRequest(request.id, 'approve')}
                        disabled={loading}
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => handleJoinRequest(request.id, 'reject')}
                        disabled={loading}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function GroupMembersList({ conversation, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);
  
  if (!conversation.is_group || !conversation.members) return null;

  const admins = conversation.members.filter(m => m.is_admin);
  const regularMembers = conversation.members.filter(m => !m.is_admin);

  return (
    <div className="group-members">
      {compact && (
        <summary onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {conversation.members.length} members
        </summary>
      )}
      {expanded && (
        <>
          {admins.length > 0 && (
            <div className="member-section">
              <h4>Admins</h4>
              <ul>
                {admins.map(m => (
                  <li key={m.id}>
                    <Crown size={14} />
                    {m.name} (@{m.handle})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {regularMembers.length > 0 && (
            <div className="member-section">
              <h4>Members</h4>
              <ul>
                {regularMembers.map(m => (
                  <li key={m.id}>{m.name} (@{m.handle})</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
