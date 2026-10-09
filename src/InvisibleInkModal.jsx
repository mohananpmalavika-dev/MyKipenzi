import { useState, useRef } from 'react';
import {
  Wand2,
  Sparkles,
  X,
  Send,
  Image,
  FileText,
  Clock,
  Heart,
  Palette,
  Check,
} from 'lucide-react';
import {
  FOG_THEMES,
  AUTO_CONCEAL_DURATIONS,
  ROMANTIC_SECRET_PROMPTS,
  formatInvisibleInkMessage,
} from './invisibleInk.js';
import { InvisibleInkCard } from './InvisibleInkCard.jsx';

export function InvisibleInkModal({
  onClose,
  onSend,
  initialText = '',
  initialFile = null,
  onError,
}) {
  const [mode, setMode] = useState(initialFile ? 'photo' : 'text');
  const [secretText, setSecretText] = useState(initialText || '');
  const [selectedTheme, setSelectedTheme] = useState('rose');
  const [selectedDelay, setSelectedDelay] = useState(8);
  const [photoFile, setPhotoFile] = useState(initialFile || null);
  const [photoPreview, setPhotoPreview] = useState(
    initialFile ? URL.createObjectURL(initialFile.file || initialFile) : null
  );
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const fileInputRef = useRef(null);

  const currentTheme = FOG_THEMES[selectedTheme] || FOG_THEMES.rose;

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onError) onError('Please choose an image.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      if (onError) onError('Choose an image smaller than 20 MB.');
      return;
    }

    setPhotoFile({ file });
    setPhotoPreview(URL.createObjectURL(file));
    setMode('photo');
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setMode('text');
  };

  const handleSelectPrompt = (prompt) => {
    setSecretText(prompt.textEn);
    setShowPromptPicker(false);
  };

  const handleSend = () => {
    if (mode === 'text' && !secretText.trim()) {
      if (onError) onError('ദയവായി ഒരു രഹസ്യ സന്ദേശം ടൈപ്പ് ചെയ്യുക.');
      return;
    }

    if (mode === 'photo' && !photoFile) {
      if (onError) onError('ദയവായി ഒരു രഹസ്യ ഫോട്ടോ തിരഞ്ഞെടുക്കുക.');
      return;
    }

    const formattedMessage = formatInvisibleInkMessage(secretText, {
      theme: selectedTheme,
      concealDelay: selectedDelay,
      isPhoto: mode === 'photo',
    });

    onSend({
      text: formattedMessage,
      file: photoFile ? photoFile.file || photoFile : null,
      caption: formattedMessage,
      theme: selectedTheme,
      concealDelay: selectedDelay,
    });

    onClose();
  };

  const previewMessageObj = {
    text: formatInvisibleInkMessage(
      secretText || (mode === 'text' ? 'നിന്നെ ഒരുപാട് സ്നേഹിക്കുന്നു... ❤️' : 'രഹസ്യ ചിത്രം 📸'),
      {
        theme: selectedTheme,
        concealDelay: selectedDelay,
        isPhoto: mode === 'photo',
      }
    ),
    attachment: photoPreview
      ? {
          name: 'secret-photo.jpg',
          mime: 'image/jpeg',
          dataUrl: photoPreview,
        }
      : null,
  };

  return (
    <div
      className="invisible-ink-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Invisible Ink Message Studio"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="invisible-ink-modal-dialog">
        {/* Header */}
        <div className="invisible-ink-modal-header">
          <div className="ink-modal-title-wrap">
            <div className="ink-modal-badge-icon">
              <Wand2 size={22} className="ink-wand-spin" />
            </div>
            <div>
              <h3>മാജിക് ഫോഗ് / രഹസ്യ മഷി 🪄🌫️</h3>
              <p>പങ്കാളി വിരൽ കൊണ്ട് ഉരച്ചു മായിക്കുമ്പോൾ മാത്രം തെളിയുന്ന സന്ദേശം!</p>
            </div>
          </div>
          <button
            type="button"
            className="ink-modal-close-btn"
            onClick={onClose}
            aria-label="Close Invisible Ink modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body content */}
        <div className="invisible-ink-modal-body">
          {/* Mode Switcher: Text vs Photo */}
          <div className="ink-mode-pills">
            <button
              type="button"
              className={`ink-mode-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => setMode('text')}
            >
              <FileText size={16} /> രഹസ്യ സന്ദേശം (Secret Note)
            </button>
            <button
              type="button"
              className={`ink-mode-btn ${mode === 'photo' ? 'active' : ''}`}
              onClick={() => {
                setMode('photo');
                if (!photoFile && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              <Image size={16} /> രഹസ്യ ഫോട്ടോ (Secret Photo)
            </button>
          </div>

          {/* Theme Selector */}
          <div className="ink-config-section">
            <label className="ink-section-label">
              <Palette size={15} /> മൂടൽമഞ്ഞ് നിറം (Fog Theme):
            </label>
            <div className="ink-theme-grid">
              {Object.values(FOG_THEMES).map((th) => {
                const isSelected = selectedTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    className={`ink-theme-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTheme(th.id)}
                    style={{
                      borderColor: isSelected ? th.primaryColor : 'transparent',
                    }}
                  >
                    <span className="ink-theme-emoji">{th.emoji}</span>
                    <div className="ink-theme-names">
                      <strong>{th.name}</strong>
                      <small>{th.name}</small>
                    </div>
                    {isSelected && (
                      <span className="ink-theme-check" style={{ background: th.primaryColor }}>
                        <Check size={12} color="#fff" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-conceal Duration */}
          <div className="ink-config-section">
            <label className="ink-section-label">
              <Clock size={15} /> സ്വയം വീണ്ടും മറയാൻ (Auto-refog Timer):
            </label>
            <div className="ink-delay-pills">
              {AUTO_CONCEAL_DURATIONS.map((dur) => (
                <button
                  key={dur.value}
                  type="button"
                  className={`ink-delay-pill ${selectedDelay === dur.value ? 'active' : ''}`}
                  onClick={() => setSelectedDelay(dur.value)}
                >
                  {dur.labelFull}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          {mode === 'photo' ? (
            <div className="ink-photo-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickFile}
              />
              {photoPreview ? (
                <div className="ink-photo-preview-box">
                  <img src={photoPreview} alt="Secret upload preview" className="ink-preview-img" />
                  <div className="ink-photo-actions">
                    <button
                      type="button"
                      className="ink-change-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      ഫോട്ടോ മാറ്റുക (Change)
                    </button>
                    <button
                      type="button"
                      className="ink-remove-photo-btn"
                      onClick={handleRemovePhoto}
                    >
                      കളയുക (Remove)
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="ink-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image size={36} className="ink-dropzone-icon" />
                  <strong>രഹസ്യ ഫോട്ടോ തിരഞ്ഞെടുക്കുക</strong>
                  <small>ക്ലിക്ക് ചെയ്ത് ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യാം (Max 20MB)</small>
                </button>
              )}

              <div className="ink-caption-wrap">
                <input
                  type="text"
                  placeholder="ഫോട്ടോയ്ക്ക് ഒരു രഹസ്യ അടിക്കുറിപ്പ് (Optional caption)..."
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  className="ink-caption-input"
                  maxLength={500}
                />
              </div>
            </div>
          ) : (
            <div className="ink-text-composer-area">
              <div className="ink-composer-toolbar">
                <span className="ink-input-label">നിങ്ങളുടെ പ്രണയ സന്ദേശം:</span>
                <button
                  type="button"
                  className="ink-prompts-toggle-btn"
                  onClick={() => setShowPromptPicker(!showPromptPicker)}
                >
                  <Heart size={14} /> പ്രണയ ആശയങ്ങൾ ({showPromptPicker ? 'മറയ്ക്കുക' : 'കാണിക്കുക'})
                </button>
              </div>

              {/* Romantic Prompts Drawer */}
              {showPromptPicker && (
                <div className="ink-prompts-drawer">
                  <div className="ink-prompts-title">
                    <Sparkles size={14} /> ക്ലിക്ക് ചെയ്ത് ചേർക്കാവുന്ന മനോഹര വാക്കുകൾ:
                  </div>
                  <div className="ink-prompts-list">
                    {ROMANTIC_SECRET_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        className="ink-prompt-item"
                        onClick={() => handleSelectPrompt(p)}
                      >
                        <p className="prompt-ml">{p.textMl}</p>
                        <small className="prompt-en">{p.textEn}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className="ink-secret-textarea"
                rows={4}
                placeholder="എന്താണ് ആ രഹസ്യം? സ്നേഹവാക്കുകൾ ഇവിടെ കുറിക്കൂ... 💌"
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                maxLength={3000}
              />
              <div className="ink-text-charcount">{secretText.length} / 3000</div>
            </div>
          )}

          {/* Live Scratch Test & Preview */}
          <div className="ink-preview-section">
            <div className="ink-preview-title">
              <Sparkles size={14} /> ലൈവ് പ്രിവ്യൂ (താഴെ വിരൽ കൊണ്ട് ഉരച്ച് ടെസ്റ്റ് ചെയ്യാം):
            </div>
            <div className="ink-preview-container">
              <InvisibleInkCard
                key={`${selectedTheme}-${selectedDelay}-${photoPreview ? 'img' : 'text'}`}
                message={previewMessageObj}
                mine={true}
                isPreview={true}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="invisible-ink-modal-footer">
          <button type="button" className="ink-cancel-btn" onClick={onClose}>
            റദ്ദാക്കുക (Cancel)
          </button>
          <button
            type="button"
            className="ink-send-btn"
            onClick={handleSend}
            disabled={mode === 'text' ? !secretText.trim() : !photoFile}
            style={{ background: currentTheme.primaryColor }}
          >
            <Send size={18} /> രഹസ്യമായി അയക്കാം 🪄
          </button>
        </div>
      </div>
    </div>
  );
}
