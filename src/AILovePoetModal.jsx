import { useState } from 'react';
import {
  X,
  Sparkles,
  Heart,
  Send,
  Copy,
  RefreshCw,
  Edit3,
  Feather,
  Check,
  BookOpen,
} from 'lucide-react';
import { api } from './api.js';
import {
  LOVE_POET_TONES,
  QUICK_SPARKS,
  generateLoveText,
} from '../shared/aiLovePoet.js';
import { triggerHeartbeatHaptics } from './heartbeatAudio.js';

export function AILovePoetModal({
  _user,
  peer,
  initialDraft = '',
  onClose,
  onApplyToComposer,
  onSendDirect,
  onError,
}) {
  const [selectedTone, setSelectedTone] = useState('romantic_deep');
  const [selectedLang, setSelectedLang] = useState('ml'); // 'ml' | 'manglish' | 'en'
  const [selectedStyle, setSelectedStyle] = useState('letter'); // 'short' | 'poetic' | 'letter'
  const [userPrompt, setUserPrompt] = useState(initialDraft);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seedCount, setSeedCount] = useState(0);

  const handleGenerate = async (tone = selectedTone, lang = selectedLang, style = selectedStyle) => {
    setIsGenerating(true);
    triggerHeartbeatHaptics([30]);
    try {
      const res = await api('/ai/polish-love-letter', {
        method: 'POST',
        body: {
          prompt: userPrompt,
          tone,
          language: lang,
          style,
          partnerName: peer?.name || 'Sweetheart',
        },
      });
      if (res.text) {
        setGeneratedText(res.text);
      }
    } catch {
      // Fallback gracefully on client
      const fallback = generateLoveText({
        tone,
        language: lang,
        style,
        prompt: userPrompt,
        partnerName: peer?.name || 'Sweetheart',
        seedIndex: seedCount + 1,
      });
      setSeedCount((s) => s + 1);
      setGeneratedText(fallback);
    } finally {
      setIsGenerating(false);
      triggerHeartbeatHaptics([40, 60]);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(generatedText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    triggerHeartbeatHaptics([25]);
  };

  const handleApply = () => {
    if (!generatedText) return;
    onApplyToComposer?.(generatedText);
    triggerHeartbeatHaptics([50]);
    onClose?.();
  };

  const handleSend = async () => {
    if (!generatedText) return;
    try {
      await onSendDirect?.(generatedText);
      triggerHeartbeatHaptics([60, 80]);
      onClose?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <div
      className="love-poet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="AI Love Poetry and Letter Polisher"
      onClick={onClose}
    >
      <div
        className="love-poet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="love-poet-header">
          <div className="love-poet-title-group">
            <div className="love-poet-icon-badge">
              <Sparkles size={20} className="sparkle-pulse" />
            </div>
            <div>
              <h2>AI Love Poetry & Letter Polisher ✍️💌</h2>
              <p>വികാരങ്ങൾ വാക്കുകളാക്കാൻ AI പ്രണയ സഹായി</p>
            </div>
          </div>
          <button
            type="button"
            className="love-poet-close-btn"
            onClick={onClose}
            aria-label="Close polisher"
          >
            <X size={20} />
          </button>
        </div>

        <div className="love-poet-content">
          {/* Tone Selector */}
          <div className="poet-section">
            <label className="poet-section-label">
              <span>ഭാവം / മൂഡ് തിരഞ്ഞെടുക്കുക (Select Emotion & Tone)</span>
            </label>
            <div className="poet-tones-scroll" role="radiogroup">
              {LOVE_POET_TONES.map((t) => {
                const isSelected = selectedTone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`poet-tone-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTone(t.id);
                      if (generatedText) handleGenerate(t.id, selectedLang, selectedStyle);
                    }}
                    title={t.description}
                  >
                    <span className="poet-tone-icon">{t.icon}</span>
                    <span className="poet-tone-ml">{t.labelMl}</span>
                    <span className="poet-tone-en">{t.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Style Selector Rows */}
          <div className="poet-controls-row">
            <div className="poet-control-group">
              <label>ഭാഷ (Language):</label>
              <div className="poet-toggle-pills">
                <button
                  type="button"
                  className={selectedLang === 'ml' ? 'active' : ''}
                  onClick={() => setSelectedLang('ml')}
                >
                  മലയാളം
                </button>
                <button
                  type="button"
                  className={selectedLang === 'manglish' ? 'active' : ''}
                  onClick={() => setSelectedLang('manglish')}
                >
                  Manglish
                </button>
                <button
                  type="button"
                  className={selectedLang === 'en' ? 'active' : ''}
                  onClick={() => setSelectedLang('en')}
                >
                  English
                </button>
              </div>
            </div>

            <div className="poet-control-group">
              <label>ശൈലി (Style):</label>
              <div className="poet-toggle-pills">
                <button
                  type="button"
                  className={selectedStyle === 'short' ? 'active' : ''}
                  onClick={() => setSelectedStyle('short')}
                >
                  കുഞ്ഞു വരികൾ (Short)
                </button>
                <button
                  type="button"
                  className={selectedStyle === 'poetic' ? 'active' : ''}
                  onClick={() => setSelectedStyle('poetic')}
                >
                  കവിതാ ശൈലി (Poetic)
                </button>
                <button
                  type="button"
                  className={selectedStyle === 'letter' ? 'active' : ''}
                  onClick={() => setSelectedStyle('letter')}
                >
                  പ്രണയലേഖനം (Letter)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Feeling Sparks */}
          <div className="poet-section">
            <label className="poet-section-label">
              <span>പ്രചോദനം (Quick Sparks):</span>
            </label>
            <div className="poet-sparks-row">
              {QUICK_SPARKS.map((spark, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="poet-spark-btn"
                  onClick={() => setUserPrompt(spark.text)}
                >
                  ✨ {spark.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Prompt Input */}
          <div className="poet-input-group">
            <textarea
              className="poet-textarea"
              placeholder={`നിങ്ങളുടെ ഉള്ളിലുള്ള ചിന്തകളോ സങ്കടങ്ങളോ ഇവിടെ കുറിക്കാം... (ഉദാ: ഇന്നലെ വഴക്കിട്ടു സോറി പറയണം, അല്ലെങ്കിൽ ${peer?.name || 'പ്രിയതമയെ'} ഓർത്ത് എഴുതുന്ന വരികൾ)`}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
            />
            <button
              type="button"
              className="poet-generate-main-btn"
              disabled={isGenerating}
              onClick={() => void handleGenerate()}
            >
              <Sparkles size={18} className={isGenerating ? 'spin' : ''} />
              <span>
                {isGenerating
                  ? 'വരികൾ മിനുക്കുന്നു... (Polishing Words)'
                  : generatedText
                    ? 'വീണ്ടും മിനുക്കൂ (Polish Again)'
                    : 'മിനുക്കി എടുക്കൂ ✨ (Generate & Polish)'}
              </span>
            </button>
          </div>

          {/* Output Parchment Card */}
          {generatedText && (
            <div className="poet-result-card">
              <div className="poet-result-header">
                <div className="poet-result-badge">
                  <Heart size={14} fill="#e91e63" color="#e91e63" />
                  <span>
                    {peer?.name ? `${peer.name}-നുള്ള പ്രണയവരികൾ` : 'തയ്യാറാക്കിയ വരികൾ'}
                  </span>
                </div>
                <button
                  type="button"
                  className="poet-refresh-icon-btn"
                  title="മറ്റൊരു വരി കാണുക (Generate another)"
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating}
                >
                  <RefreshCw size={14} className={isGenerating ? 'spin' : ''} />
                  <span>മറ്റൊന്ന്</span>
                </button>
              </div>

              <div className="poet-result-text" dir="auto">
                <p>{generatedText}</p>
              </div>

              <div className="poet-result-actions">
                <button
                  type="button"
                  className="poet-action-btn secondary"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'പകർത്തി! (Copied)' : 'പകർത്തുക (Copy)'}</span>
                </button>
                <button
                  type="button"
                  className="poet-action-btn primary"
                  onClick={handleApply}
                >
                  <Edit3 size={16} />
                  <span>ചാറ്റിലേക്ക് ചേർക്കുക (Apply to Chat)</span>
                </button>
                <button
                  type="button"
                  className="poet-action-btn send"
                  onClick={() => void handleSend()}
                >
                  <Send size={16} />
                  <span>നേരിട്ട് അയക്കുക (Send)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
