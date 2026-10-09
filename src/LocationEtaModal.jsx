import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Send,
  X,
  Compass,
  CheckCircle2,
  AlertCircle,
  Car,
  Home,
  ShieldCheck,
  RefreshCw,
  Share2,
} from 'lucide-react';

const ETA_PRESETS = [
  {
    id: 'almost-there',
    icon: '🏃',
    labelMl: 'ഇപ്പോൾ എത്തും (~5 മിനിറ്റ്)',
    labelEn: 'Almost there (~5 mins)',
    minutes: 5,
    statusText: 'Almost there! Just 5 minutes away 🏃💨',
  },
  {
    id: 'on-my-way',
    icon: '🚗',
    labelMl: 'വരുന്നുണ്ട് (~15 മിനിറ്റ്)',
    labelEn: 'On my way (~15 mins)',
    minutes: 15,
    statusText: 'On my way! Approximately 15 mins away 🚗✨',
  },
  {
    id: 'heading-home',
    icon: '🏠',
    labelMl: 'വീട്ടിലേക്ക് തിരിച്ചു (~30 മിനിറ്റ്)',
    labelEn: 'Heading home (~30 mins)',
    minutes: 30,
    statusText: 'Heading home safely (~30 mins) 🏡🤍',
  },
  {
    id: 'traffic',
    icon: '🚦',
    labelMl: 'ട്രാഫിക്കിലാണ്, കുറച്ച് വൈകും',
    labelEn: 'Stuck in traffic, slight delay',
    minutes: 40,
    statusText: 'Stuck in traffic, taking a little longer 🚦🙏',
  },
  {
    id: 'reached-safely',
    icon: '💖',
    labelMl: 'സുരക്ഷിതമായി എത്തിച്ചേർന്നു!',
    labelEn: 'Reached safely, do not worry!',
    minutes: 0,
    statusText: 'Reached safely! Thinking of you 💖✨',
  },
];

export function LocationEtaModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
}) {
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [selectedEta, setSelectedEta] = useState(ETA_PRESETS[1]);
  const [customEtaText, setCustomEtaText] = useState('');
  const [loadingGps, setLoadingGps] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Fetch real geolocation
  const fetchLocation = useCallback(() => {
    setLoadingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setLoadingGps(false);
      // Fallback default coordinates
      setCoords({ lat: 9.9312, lng: 76.2673 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setAccuracy(Math.round(pos.coords.accuracy));
        setLoadingGps(false);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? 'Location access was denied. You can still set custom ETA below.'
            : 'Unable to pinpoint GPS. Using default location.'
        );
        setLoadingGps(false);
        // Soft fallback
        setCoords({ lat: 9.9312, lng: 76.2673 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const isMalayalam = false;

  const handleSendEta = () => {
    const lat = coords?.lat ? coords.lat.toFixed(4) : null;
    const lng = coords?.lng ? coords.lng.toFixed(4) : null;
    const etaText = customEtaText.trim() || (isMalayalam ? selectedEta.labelMl : selectedEta.labelEn);
    const place = placeName.trim() ? ` · ${placeName.trim()}` : '';

    const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    const messageText = `📍 Live Location & ETA Update:\n"${etaText}"${place}\n` +
      (mapsUrl ? `🗺️ Map Coordinates: ${lat}° N, ${lng}° E\n🔗 View on Map: ${mapsUrl}\n` : '') +
      `⏱️ Timestamp: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Safe Travel 💖`;

    if (onSendToChat) {
      onSendToChat(messageText);
    }

    // Also broadcast live socket event for immediate partner banner
    socket?.emit('location:share', {
      conversation_id: conversationId,
      lat,
      lng,
      etaText,
      placeName: placeName.trim(),
      timestamp: Date.now(),
    });

    setSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      className="location-eta-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Live Location and ETA Sharing"
    >
      <div className="location-eta-card">
        {/* Header */}
        <div className="location-eta-header">
          <div className="location-eta-title">
            <span className="location-badge-icon">
              <Navigation size={22} className="nav-icon-pulse" />
            </span>
            <div>
              <h3>{isMalayalam ? 'ലൈവ് ലൊക്കേഷൻ & ETA 🚗' : 'Live Location & ETA 🚗'}</h3>
              <p>
                {isMalayalam
                  ? `${peer?.name || 'പങ്കാളി'}-ക്ക് തത്സമയം യാത്രാ വിവരങ്ങൾ പങ്കിടുക`
                  : `Share live journey updates with ${peer?.name || 'your partner'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* GPS Status & Map Card */}
        <div className="location-map-preview-box">
          <div className="map-gradient-background">
            <div className="map-grid-pattern" />
            <div className="map-pin-pulse-container">
              <span className="pin-ripple-ring" />
              <div className="map-pin-avatar-badge">
                <MapPin size={24} className="heart-pin-icon" />
              </div>
            </div>
            {coords && (
              <div className="coordinates-pill">
                <Compass size={13} />
                <span>
                  {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                  {accuracy && ` (±${accuracy}m accuracy)`}
                </span>
              </div>
            )}
          </div>

          <div className="map-status-row">
            {loadingGps ? (
              <span className="gps-status-loading">
                <RefreshCw size={14} className="spin-icon" />
                {isMalayalam ? 'ജിപിഎസ് കണക്റ്റ് ചെയ്യുന്നു...' : 'Acquiring GPS location...'}
              </span>
            ) : gpsError ? (
              <span className="gps-status-warning">
                <AlertCircle size={14} />
                {gpsError}
              </span>
            ) : (
              <span className="gps-status-success">
                <ShieldCheck size={14} />
                {isMalayalam ? 'കൃത്യമായ ലൊക്കേഷൻ ലഭ്യമാണ്' : 'Live GPS lock active'}
              </span>
            )}
            <button
              type="button"
              className="refresh-gps-btn"
              onClick={fetchLocation}
              title="Refresh GPS"
              disabled={loadingGps}
            >
              <RefreshCw size={14} className={loadingGps ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        {/* Place / Landmark input */}
        <div className="location-input-field">
          <label htmlFor="custom-landmark-input">
            {isMalayalam ? 'സ്ഥലത്തിന്റെ പേര് (ഓപ്ഷണൽ)' : 'Landmark / Current spot (optional)'}
          </label>
          <input
            id="custom-landmark-input"
            type="text"
            placeholder={
              isMalayalam
                ? 'ഉദാ: മറൈൻ ഡ്രൈവ്, മെട്രോ സ്റ്റേഷൻ, ഓഫീസ്...'
                : 'e.g. Metro Station, Marine Drive, Office...'
            }
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* ETA Presets */}
        <div className="eta-presets-section">
          <label>
            <Clock size={14} />
            <span>{isMalayalam ? 'ഞാൻ എത്താറായി (ETA Status):' : 'Estimated Time of Arrival (ETA):'}</span>
          </label>

          <div className="eta-preset-grid">
            {ETA_PRESETS.map((p) => {
              const isSelected = selectedEta.id === p.id && !customEtaText;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`eta-preset-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedEta(p);
                    setCustomEtaText('');
                  }}
                >
                  <span className="eta-icon">{p.icon}</span>
                  <span className="eta-label">
                    {isMalayalam ? p.labelMl : p.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Status Message input */}
        <div className="location-input-field">
          <label htmlFor="custom-eta-status">
            {isMalayalam ? 'കസ്റ്റം സന്ദേശം (Custom note)' : 'Custom message'}
          </label>
          <input
            id="custom-eta-status"
            type="text"
            placeholder={
              isMalayalam
                ? 'സ്വന്തം വാക്കുകളിൽ എഴുതാം...'
                : 'Write your own ETA update...'
            }
            value={customEtaText}
            onChange={(e) => setCustomEtaText(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Action Button */}
        <div className="location-eta-actions">
          <button
            type="button"
            className={`send-eta-btn ${sentSuccess ? 'success' : ''}`}
            onClick={handleSendEta}
            disabled={sentSuccess}
          >
            {sentSuccess ? (
              <>
                <CheckCircle2 size={18} />
                <span>{isMalayalam ? 'അയച്ചു കഴിഞ്ഞു! 💖' : 'Sent to Chat! 💖'}</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>
                  {isMalayalam
                    ? 'ലൊക്കേഷൻ & ETA പങ്കിടുക 🚗'
                    : 'Share Location & ETA 🚗'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
