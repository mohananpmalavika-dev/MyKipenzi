import { useState, useEffect } from 'react';
import { Cloud, Download, Upload, HardDrive, Check, AlertCircle, Loader } from 'lucide-react';
import { api } from './api.js';
import { Modal } from './components.jsx';

/**
 * Cloud Backup Component
 * Backup and restore chats to Google Drive / iCloud
 */

export function CloudBackupPanel({ onClose }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    auto_backup: false,
    backup_frequency: 'daily',
    include_media: true,
    backup_provider: 'local', // 'local', 'google_drive', 'icloud'
  });

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  const loadBackups = async () => {
    try {
      const result = await api('/backups');
      setBackups(result.backups || []);
    } catch (e) {
      console.error('Failed to load backups:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await api('/backups/settings');
      setSettings(result);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await api('/backups/create', {
        method: 'POST',
        body: {
          include_media: settings.include_media,
          provider: settings.backup_provider,
        },
      });

      if (settings.backup_provider === 'local') {
        // Download backup file
        const blob = await fetch(`/api/backups/${result.id}/download`).then((r) => r.blob());
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kipenzi-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      await loadBackups();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId) => {
    if (
      !confirm(
        'Restore from backup? This will overwrite your current data. Make sure you have a recent backup first.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      await api(`/backups/${backupId}/restore`, { method: 'POST' });

      alert('Backup restored successfully! Please refresh the page.');
      window.location.reload();
    } catch (e) {
      setError('Restore failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backupId) => {
    if (!confirm('Delete this backup?')) return;

    try {
      await api(`/backups/${backupId}`, { method: 'DELETE' });
      await loadBackups();
    } catch (e) {
      alert('Failed to delete backup: ' + e.message);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await api('/backups/settings', {
        method: 'PUT',
        body: settings,
      });
      alert('Settings saved!');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleDrive = () => {
    // Placeholder for Google Drive OAuth
    alert('Google Drive integration coming soon! Use local backup for now.');
  };

  const connectICloud = () => {
    // Placeholder for iCloud integration
    alert('iCloud integration coming soon! Use local backup for now.');
  };

  return (
    <Modal title="Chat Backup & Restore" onClose={onClose} wide>
      <div className="cloud-backup-panel">
        <div className="backup-intro">
          <Cloud size={48} />
          <h3>Keep Your Memories Safe</h3>
          <p>Backup your conversations and restore them anytime</p>
        </div>

        {error && (
          <div className="backup-error" role="alert">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Backup Settings */}
        <section className="backup-settings">
          <h4>Backup Settings</h4>

          <label>
            Backup Provider
            <select
              value={settings.backup_provider}
              onChange={(e) => setSettings({ ...settings, backup_provider: e.target.value })}
            >
              <option value="local">Local Device (Download File)</option>
              <option value="google_drive" disabled>
                Google Drive (Coming Soon)
              </option>
              <option value="icloud" disabled>
                iCloud (Coming Soon)
              </option>
            </select>
          </label>

          {settings.backup_provider === 'google_drive' && (
            <button className="connect-btn" onClick={connectGoogleDrive}>
              Connect Google Drive
            </button>
          )}

          {settings.backup_provider === 'icloud' && (
            <button className="connect-btn" onClick={connectICloud}>
              Connect iCloud
            </button>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.auto_backup}
              onChange={(e) => setSettings({ ...settings, auto_backup: e.target.checked })}
            />
            <span>Enable automatic backups</span>
          </label>

          {settings.auto_backup && (
            <label>
              Backup Frequency
              <select
                value={settings.backup_frequency}
                onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.include_media}
              onChange={(e) => setSettings({ ...settings, include_media: e.target.checked })}
            />
            <span>Include media files (photos, videos)</span>
          </label>

          <button className="btn-secondary" onClick={saveSettings} disabled={loading}>
            Save Settings
          </button>
        </section>

        {/* Create Backup */}
        <section className="backup-actions">
          <button
            className="btn-primary backup-create-btn"
            onClick={createBackup}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="spinner" size={20} />
                Creating Backup...
              </>
            ) : (
              <>
                <Upload size={20} />
                Create Backup Now
              </>
            )}
          </button>
        </section>

        {/* Backup History */}
        <section className="backup-history">
          <h4>Backup History</h4>

          {backups.length === 0 ? (
            <div className="backup-empty">
              <HardDrive size={48} />
              <p>No backups yet</p>
              <small>Create your first backup to keep your data safe</small>
            </div>
          ) : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div key={backup.id} className="backup-item">
                  <div className="backup-icon">
                    <Check size={20} />
                  </div>

                  <div className="backup-info">
                    <strong>{new Date(backup.created_at).toLocaleString()}</strong>
                    <small>
                      {formatBytes(backup.size)} •{' '}
                      {backup.include_media ? 'With media' : 'Messages only'} •{' '}
                      {backup.provider === 'local' ? 'Local' : backup.provider}
                    </small>
                  </div>

                  <div className="backup-actions">
                    <button
                      className="btn-icon-small"
                      onClick={() => restoreBackup(backup.id)}
                      title="Restore backup"
                      disabled={loading}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className="btn-icon-small"
                      onClick={() => deleteBackup(backup.id)}
                      title="Delete backup"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="backup-footer">
          <small>
            💡 Tip: Regular backups protect your conversations from data loss. Local backups are
            stored on your device only.
          </small>
        </div>
      </div>
    </Modal>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default CloudBackupPanel;
