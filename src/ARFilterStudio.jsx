import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Camera,
  Download,
  RotateCcw,
  Check,
  Send,
  Sliders,
} from 'lucide-react';
import {
  AR_FILTERS,
  FILTER_CATEGORIES,
  getFilterById,
  playFilterSoundEffect,
} from './arVideoFilters.js';

export function ARFilterStudio({
  activeFilterId = 'none',
  onSelectFilter,
  onCaptureSnapshot,
  onSendSnapshot,
  processor = null,
  isMalayalam = false,
  isOpen = false,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState('romantic');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blurAmount, setBlurAmount] = useState(16);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [snapCountdown, setSnapCountdown] = useState(null);

  const countdownTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  if (!isOpen) return null;

  const currentFilter = getFilterById(activeFilterId);
  const filteredList = AR_FILTERS.filter(
    (f) => f.category === selectedCategory || (f.id === 'none' && selectedCategory !== 'all'),
  );

  const handleFilterClick = (filter) => {
    onSelectFilter?.(filter.id, { blurAmount });
    if (soundEnabled && filter.sound) {
      playFilterSoundEffect(filter.sound, false);
    } else if (soundEnabled && filter.id !== 'none') {
      playFilterSoundEffect('switch', false);
    }
  };

  const handleBlurChange = (e) => {
    const val = Number(e.target.value);
    setBlurAmount(val);
    if (processor) {
      processor.blurAmount = val;
    }
    onSelectFilter?.(activeFilterId, { blurAmount: val });
  };

  const handleTriggerSnapshot = () => {
    if (isSnapping) return;
    setIsSnapping(true);
    setSnapCountdown(3);

    let count = 3;
    countdownTimer.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setSnapCountdown(count);
      } else {
        clearInterval(countdownTimer.current);
        setSnapCountdown(null);
        // Trigger Flash & Capture
        setFlashActive(true);
        if (soundEnabled) playFilterSoundEffect('camera-shutter', false);

        setTimeout(() => {
          setFlashActive(false);
          let dataUrl = null;
          if (processor) {
            dataUrl = processor.captureSnapshot('image/png');
          }
          if (dataUrl) {
            setSnapshotPreview(dataUrl);
            onCaptureSnapshot?.(dataUrl);
          }
          setIsSnapping(false);
        }, 250);
      }
    }, 800);
  };

  const handleDownloadSnapshot = () => {
    if (!snapshotPreview) return;
    const a = document.createElement('a');
    a.href = snapshotPreview;
    a.download = `kipenzi-ar-snap-${Date.now()}.png`;
    a.click();
  };

  const handleSendToChat = () => {
    if (!snapshotPreview) return;
    onSendSnapshot?.(snapshotPreview);
    setSnapshotPreview(null);
  };

  return (
    <div
      className="ar-studio-panel"
      role="dialog"
      aria-label={isMalayalam ? 'AR ഫിൽട്ടറുകളും പശ്ചാത്തലങ്ങളും' : 'AR Filters & Backgrounds'}
    >
      {/* Camera Flash Overlay */}
      {flashActive && <div className="camera-flash-overlay" />}

      {/* Snapshot Countdown Overlay */}
      {snapCountdown !== null && (
        <div className="snap-countdown-badge">
          <span>{snapCountdown}</span>
          <p>{isMalayalam ? 'സ്മൈൽ! ചിയേഴ്സ് 📸' : 'Smile! Say Cheese! 📸'}</p>
        </div>
      )}

      {/* Header */}
      <div className="ar-studio-header">
        <div className="ar-header-left">
          <span className="ar-sparkle-badge">
            <Sparkles size={16} />
          </span>
          <div>
            <h3>{isMalayalam ? 'AR ഫിൽട്ടറുകൾ & ബാക്ക്ഗ്രൗണ്ടുകൾ' : 'AR Filters & Backgrounds'}</h3>
            <span className="ar-active-name">
              {isMalayalam ? currentFilter.nameMl : currentFilter.nameEn} · {currentFilter.badge}
            </span>
          </div>
        </div>

        <div className="ar-header-actions">
          <button
            className={`ar-icon-toggle ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'ശബ്ദങ്ങൾ ഓഫാക്കുക' : 'ശബ്ദങ്ങൾ ഓണാക്കുക'}
            aria-label="Toggle AR Sound Effects"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            className="ar-snap-btn"
            onClick={handleTriggerSnapshot}
            disabled={isSnapping}
            title={isMalayalam ? 'AR ഫോട്ടോ എടുക്കുക' : 'Capture AR Photo'}
            aria-label="Capture AR Photo"
          >
            <Camera size={16} />
            <span>{isMalayalam ? 'ഫോട്ടോ എടുക്കൂ' : 'Snap'}</span>
          </button>

          <button
            className="ar-close-btn"
            onClick={onClose}
            aria-label="Close AR Filters"
            title="ക്ലോസ് ചെയ്യുക"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="ar-category-tabs">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`ar-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="ar-tab-icon">{cat.icon}</span>
            <span>{isMalayalam ? cat.nameMl : cat.nameEn}</span>
          </button>
        ))}
      </div>

      {/* Filter Grid */}
      <div className="ar-filters-grid">
        {filteredList.map((filter) => {
          const isActive = activeFilterId === filter.id;
          return (
            <button
              key={filter.id}
              className={`ar-filter-card ${isActive ? 'selected' : ''}`}
              onClick={() => handleFilterClick(filter)}
              type="button"
            >
              <div className="ar-card-icon-wrap">
                <span className="ar-card-icon">{filter.icon}</span>
                {isActive && (
                  <span className="ar-card-check">
                    <Check size={12} />
                  </span>
                )}
                {filter.badge && filter.id !== 'none' && (
                  <span className="ar-card-badge">{filter.badge}</span>
                )}
              </div>
              <span className="ar-card-title">
                {isMalayalam ? filter.nameMl : filter.nameEn}
              </span>
              <span className="ar-card-desc">
                {isMalayalam ? filter.descriptionMl : filter.descriptionEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls Drawer (e.g. for Studio Blur adjustment) */}
      {activeFilterId === 'studio-blur' && (
        <div className="ar-adjust-bar">
          <div className="ar-slider-group">
            <div className="ar-slider-label">
              <Sliders size={14} />
              <span>{isMalayalam ? 'ബ്ലർ തീവ്രത (Bokeh Blur)' : 'Bokeh Depth'}</span>
              <strong>{blurAmount}px</strong>
            </div>
            <input
              type="range"
              min="6"
              max="28"
              value={blurAmount}
              onChange={handleBlurChange}
              className="ar-range-slider"
            />
          </div>
        </div>
      )}

      {/* Bottom Bar with Reset */}
      <div className="ar-studio-footer">
        <button
          className="ar-reset-btn"
          onClick={() => onSelectFilter?.('none')}
          disabled={activeFilterId === 'none'}
        >
          <RotateCcw size={14} />
          <span>{isMalayalam ? 'ഫിൽട്ടറുകൾ നീക്കം ചെയ്യുക' : 'Reset to Normal'}</span>
        </button>
        <span className="ar-hint-text">
          {isMalayalam
            ? 'WebRTC തത്സമയ ഫിൽട്ടർ ലൈവ് കോളിൽ പങ്കാളിക്കും കാണാം ✨'
            : 'Live AR is visible to both you and your call partner ✨'}
        </span>
      </div>

      {/* Snapshot Preview Dialog */}
      {snapshotPreview && (
        <div className="ar-snapshot-modal" role="dialog" aria-modal="true">
          <div className="ar-snapshot-content">
            <div className="ar-snapshot-header">
              <h4>{isMalayalam ? '📸 നിങ്ങളുടെ AR ചിത്രം റെഡി!' : '📸 Your AR Snapshot!'}</h4>
              <button
                className="ar-icon-toggle"
                onClick={() => setSnapshotPreview(null)}
                aria-label="Close Snapshot"
              >
                <X size={16} />
              </button>
            </div>
            <div className="ar-snapshot-image-wrap">
              <img src={snapshotPreview} alt="AR Snapshot" className="ar-snapshot-img" />
            </div>
            <div className="ar-snapshot-actions">
              <button className="ar-action-btn secondary" onClick={handleDownloadSnapshot}>
                <Download size={16} />
                <span>{isMalayalam ? 'സേവ് ചെയ്യുക' : 'Download Photo'}</span>
              </button>
              {onSendSnapshot && (
                <button className="ar-action-btn primary" onClick={handleSendToChat}>
                  <Send size={16} />
                  <span>{isMalayalam ? 'ചാറ്റിലേക്ക് അയക്കൂ' : 'Send to Bestie'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
