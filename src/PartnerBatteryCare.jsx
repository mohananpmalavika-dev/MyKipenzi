import { useState } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Heart,
  X,
  Sliders,
  Sparkles,
  Plug,
} from 'lucide-react';
import {
  BATTERY_THRESHOLDS,
  BATTERY_NUDGE_PRESETS,
  getBatteryStatusText,
  getBatteryColor,
  isBatteryDying,
} from './batteryService.js';
import { Modal } from './components.jsx';

/**
 * 1. Partner Battery Badge for Chat Header
 * Renders at the top of the chat beside peer info.
 */
export function PartnerBatteryBadge({
  battery,
  peerName = 'Partner',
  onClick,
  isGroup = false,
}) {
  if (isGroup) return null;

  const level = battery?.battery_level ?? null;
  const isCharging = Boolean(battery?.is_charging);
  const dying = isBatteryDying(level, isCharging);
  const low = level !== null && level <= BATTERY_THRESHOLDS.LOW && !isCharging;

  let stateClass = 'state-normal';
  if (isCharging) stateClass = 'state-charging';
  else if (dying) stateClass = 'state-dying';
  else if (low) stateClass = 'state-low';

  const statusText = getBatteryStatusText(level, isCharging);
  const tooltip = `${peerName}'s Phone: ${statusText} · Tap for Battery Care & Simulator`;

  return (
    <button
      type="button"
      className={`header-battery-badge ${stateClass}`}
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="battery-badge-icon-wrap">
        {isCharging ? (
          <Zap size={14} className="battery-charging-sparkle" />
        ) : dying ? (
          <BatteryWarning size={15} />
        ) : (
          <Battery size={15} style={{ color: getBatteryColor(level, isCharging) }} />
        )}
      </span>
      <span>{level !== null ? `${level}%` : '--%'}</span>
      {isCharging && <span style={{ fontSize: '11px', opacity: 0.9 }}>⚡</span>}
    </button>
  );
}

/**
 * 2. Top-of-Chat Cute Care Alert Banner
 * Appears when partner battery drops to 5% or below (<= 5%).
 * Displays: "Her battery is dying (4%)! Don't worry if she doesn't reply 🤍"
 */
export function PartnerBatteryAlertBanner({
  battery,
  peerName = 'Her',
  onNudge,
  onSendHug,
  onOpenModal,
  onDismiss,
  dismissed = false,
}) {
  const level = battery?.battery_level ?? null;
  const isCharging = Boolean(battery?.is_charging);
  const dying = isBatteryDying(level, isCharging);

  // If dismissed or no battery info or above 5%, do not show dying alert
  if (dismissed || level === null || level > BATTERY_THRESHOLDS.DYING) {
    return null;
  }

  // If 5% or below and charging, show safe reassurance
  if (isCharging) {
    return (
      <aside className="battery-care-alert-banner charging-safe" role="status">
        <div className="battery-alert-top">
          <div className="battery-alert-content">
            <div className="battery-alert-icon-orb">⚡</div>
            <div className="battery-alert-text">
              <span className="battery-alert-title">
                She plugged in just in time ({level}%) ⚡ Charging safely now 🤍
              </span>
              <span className="battery-alert-subtitle">
                ഫോൺ ചാർജ് ചെയ്യാൻ കുത്തിയിട്ടുണ്ട് ({level}%). ഉടൻ തിരിച്ചെത്തും ⚡🤍
              </span>
            </div>
          </div>
          <button
            type="button"
            className="battery-alert-dismiss-btn"
            onClick={onDismiss}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
        <div className="battery-alert-actions">
          <button
            type="button"
            className="battery-action-chip"
            onClick={onOpenModal}
          >
            <Battery size={13} /> Battery Care Details
          </button>
        </div>
      </aside>
    );
  }

  // Exact prompt requirement:
  // ബാറ്ററി 5%-ൽ താഴെയാവുമ്പോൾ "Her battery is dying (4%)! Don't worry if she doesn't reply 🤍" എന്ന ക്യൂട്ട് കെയർ അലർട്ട്.
  return (
    <aside className="battery-care-alert-banner" role="alert">
      <div className="battery-alert-top">
        <div className="battery-alert-content">
          <div className="battery-alert-icon-orb">🪫</div>
          <div className="battery-alert-text">
            <span className="battery-alert-title">
              Her battery is dying ({level}%)! Don't worry if she doesn't reply 🤍
            </span>
            <span className="battery-alert-subtitle">
              പങ്കാളിയുടെ ഫോൺ ഓഫ് ആവാൻ പോകുന്നു ({level}%). റിപ്ലൈ തരാൻ വൈകിയാലും വിഷമിക്കേണ്ട 🤍
            </span>
          </div>
        </div>
        <button
          type="button"
          className="battery-alert-dismiss-btn"
          onClick={onDismiss}
          title="Dismiss alert"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>

      <div className="battery-alert-actions">
        <button
          type="button"
          className="battery-action-chip"
          onClick={() => onNudge?.(BATTERY_NUDGE_PRESETS[0])}
        >
          <Plug size={13} /> Remind to Charge (പ്ലഗ് ചെയ്യാൻ പറയൂ) 🔌
        </button>
        <button
          type="button"
          className="battery-action-chip"
          onClick={() => onSendHug?.(BATTERY_NUDGE_PRESETS[1])}
        >
          <Heart size={13} /> Send Love Hug (സ്നേഹാലിംഗനം) 🫂
        </button>
        <button
          type="button"
          className="battery-action-chip"
          onClick={onOpenModal}
        >
          <Battery size={13} /> Battery Care Details 🔋
        </button>
      </div>
    </aside>
  );
}

/**
 * 3. Full Partner Battery Care Modal & Simulator Dialog
 */
export function PartnerBatteryModal({
  isOpen,
  onClose,
  partnerBattery,
  userBattery,
  peer,
  onSendNudge,
  onSimulateBattery,
}) {
  const [simLevel, setSimLevel] = useState(partnerBattery?.battery_level ?? 4);
  const [simCharging, setSimCharging] = useState(Boolean(partnerBattery?.is_charging));

  if (!isOpen) return null;

  const currentLevel = partnerBattery?.battery_level ?? 75;
  const isCharging = Boolean(partnerBattery?.is_charging);
  const dying = isBatteryDying(currentLevel, isCharging);
  const low = currentLevel <= BATTERY_THRESHOLDS.LOW && !isCharging;

  const handleApplySim = (level, charging) => {
    setSimLevel(level);
    setSimCharging(charging);
    onSimulateBattery?.(level, charging);
  };

  return (
    <Modal
      title="Partner Battery & Charging Care (ബാറ്ററി & ചാർജിംഗ് കെയർ 🔋⚡)"
      onClose={onClose}
    >
      <div className="battery-modal-content">
        {/* Hero Card */}
        <div className={`battery-hero-card ${dying ? 'critical' : isCharging ? 'charging' : ''}`}>
          {/* Animated visual battery meter */}
          <div className="battery-visual-meter-wrapper">
            <div className="battery-shell">
              <div
                className={`battery-liquid-level ${dying ? 'critical' : isCharging ? 'charging' : low ? 'low' : ''}`}
                style={{ width: `${Math.max(6, Math.min(100, currentLevel))}%` }}
              />
              <div className="battery-terminal" />
              <div className="battery-meter-center-text">
                {isCharging && <Zap size={16} color="#059669" />}
                <span>{currentLevel}%</span>
              </div>
            </div>
          </div>

          <div className="battery-hero-status-pill">
            {isCharging ? (
              <span style={{ color: '#047857' }}>⚡ Charging plugged in</span>
            ) : dying ? (
              <span style={{ color: '#b91c1c' }}>🪫 Dying (≤ 5%) · Care Alert Active</span>
            ) : low ? (
              <span style={{ color: '#b45309' }}>⚠️ Low Battery · Needs Charge Soon</span>
            ) : (
              <span style={{ color: '#15803d' }}>🔋 Healthy Battery & Energetic</span>
            )}
          </div>

          <p className="battery-hero-description">
            {dying
              ? "Her phone is about to shut down (5% or less). Don't worry if she cannot reply right now! Send her a gentle hug or charging reminder."
              : isCharging
              ? `${peer?.name || 'Your partner'}'s phone is connected to power and re-energizing! Safe and ready to talk.`
              : `${peer?.name || 'Your partner'}'s phone is at ${currentLevel}%. You can chat peacefully together! 🌸`}
          </p>
        </div>

        {/* Caring Nudges Section */}
        <div className="battery-nudges-section">
          <span className="battery-section-title">
            Loving Care Actions (സ്നേഹത്തോടെ ഓർമ്മിപ്പിക്കാം)
          </span>
          <div className="battery-nudge-grid">
            {BATTERY_NUDGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="battery-nudge-btn"
                onClick={() => {
                  onSendNudge?.(preset);
                  onClose();
                }}
              >
                <div className="battery-nudge-left">
                  <span className="battery-nudge-icon">{preset.icon}</span>
                  <div className="battery-nudge-label-wrap">
                    <span className="battery-nudge-label-ml">{preset.labelMl}</span>
                    <span className="battery-nudge-label-en">{preset.labelEn}</span>
                  </div>
                </div>
                <Heart size={16} style={{ color: '#f43f5e', opacity: 0.8 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Real Device Info & Simulator Panel */}
        <div className="battery-simulator-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              <Sliders size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Battery Simulator & Testing Tool (ഡെമോ & ടെസ്റ്റിംഗ്)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Your device: {userBattery?.battery_level !== undefined ? `${userBattery.battery_level}%` : 'Auto'}
            </span>
          </div>

          <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
            Quickly test the 4% dying care alert, normal charge, or charging state:
          </p>

          <div className="battery-sim-presets-row">
            <button
              type="button"
              className="battery-sim-chip critical-highlight"
              onClick={() => handleApplySim(4, false)}
            >
              🪫 Test 4% Dying Alert
            </button>
            <button
              type="button"
              className="battery-sim-chip"
              onClick={() => handleApplySim(4, true)}
            >
              ⚡ Test 4% Charging
            </button>
            <button
              type="button"
              className="battery-sim-chip"
              onClick={() => handleApplySim(15, false)}
            >
              ⚠️ Test 15% Low
            </button>
            <button
              type="button"
              className="battery-sim-chip"
              onClick={() => handleApplySim(82, false)}
            >
              🔋 Test 82% Healthy
            </button>
            <button
              type="button"
              className="battery-sim-chip"
              onClick={() => handleApplySim(currentLevel, !isCharging)}
            >
              {isCharging ? '🔌 Unplug' : '⚡ Plug In'}
            </button>
          </div>

          <div className="battery-slider-row">
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '35px' }}>
              {simLevel}%
            </span>
            <input
              type="range"
              min="1"
              max="100"
              value={simLevel}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimLevel(val);
                handleApplySim(val, simCharging);
              }}
            />
            <button
              type="button"
              className="battery-sim-chip"
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => handleApplySim(simLevel, !simCharging)}
            >
              {simCharging ? '⚡ Charging' : '🔋 On Battery'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
