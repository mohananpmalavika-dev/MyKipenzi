import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, X, Send, Loader } from 'lucide-react';
import { api } from './api.js';
import { Modal, ButtonIcon } from './components.jsx';

/**
 * Location Sharing Component
 * Share current location, custom location, or live location
 */

export function ShareLocationModal({ conversationId, onClose, onLocationShared }) {
  const [mode, setMode] = useState('current'); // 'current', 'custom', 'live'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [liveDuration, setLiveDuration] = useState(15); // minutes

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocation(coords);

      // Reverse geocode to get address
      try {
        const addr = await reverseGeocode(coords.latitude, coords.longitude);
        setAddress(addr);
      } catch (e) {
        setAddress('Location coordinates');
      }
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        setError('Location permission denied. Please enable location access.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setError('Location information unavailable.');
      } else if (error.code === error.TIMEOUT) {
        setError('Location request timed out.');
      } else {
        setError('Failed to get location: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'current') {
      getCurrentLocation();
    }
  }, [mode]);

  const handleShare = async () => {
    if (!location) {
      setError('No location selected');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const isLive = mode === 'live';
      const result = await api(`/conversations/${conversationId}/location`, {
        method: 'POST',
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address || null,
          is_live: isLive,
          live_duration_minutes: isLive ? liveDuration : null,
        },
      });

      onLocationShared(result);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Share Location" onClose={onClose}>
      <div className="location-sharing-modal">
        <div className="location-mode-selector">
          <button
            className={`mode-btn ${mode === 'current' ? 'active' : ''}`}
            onClick={() => setMode('current')}
          >
            <Navigation size={20} />
            Current Location
          </button>
          <button
            className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}
          >
            <Clock size={20} />
            Live Location
          </button>
        </div>

        {loading && !location && (
          <div className="location-loading">
            <Loader className="spinner" size={32} />
            <p>Getting your location...</p>
          </div>
        )}

        {error && (
          <div className="location-error" role="alert">
            <p>{error}</p>
            {error.includes('permission') && (
              <small>Go to browser settings to enable location access</small>
            )}
          </div>
        )}

        {location && (
          <div className="location-preview">
            <div className="location-map-placeholder">
              <MapPin size={48} />
              <div className="location-coords">
                <strong>{address || 'Location'}</strong>
                <small>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </small>
              </div>
            </div>

            {mode === 'live' && (
              <div className="live-location-settings">
                <label>
                  <Clock size={16} />
                  Share live location for:
                  <select
                    value={liveDuration}
                    onChange={(e) => setLiveDuration(Number(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </label>
                <small className="live-warning">
                  Your location will update automatically until the timer expires or you stop
                  sharing
                </small>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleShare}
            disabled={loading || !location}
          >
            {loading ? (
              'Sharing...'
            ) : (
              <>
                <Send size={18} />
                Share Location
              </>
            )}
          </button>
        </div>

        <div className="location-privacy-notice">
          <small>
            🔒 Your location is encrypted and only visible to this conversation
          </small>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Location Message Display
 * Shows location on a map with option to open in maps app
 */
export function LocationMessage({ location, isLive }) {
  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const isExpired = isLive && location.live_until && new Date(location.live_until) < new Date();

  return (
    <div className="location-message">
      <div className="location-map-preview" onClick={openInMaps}>
        <MapPin size={32} className="location-icon" />
        <div className="location-info">
          <strong>{location.address || 'Shared Location'}</strong>
          {isLive && !isExpired && (
            <span className="live-badge">
              <span className="live-pulse" />
              Live Location
            </span>
          )}
          {isLive && isExpired && <span className="expired-badge">Location sharing ended</span>}
        </div>
      </div>
      <button className="open-maps-btn" onClick={openInMaps}>
        <Navigation size={16} />
        Open in Maps
      </button>
    </div>
  );
}

/**
 * Live Location Tracker
 * Updates live location periodically
 */
export function useLiveLocation(messageId, duration) {
  const [active, setActive] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active || !messageId) return;

    const updateLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 5000,
          });
        });

        await api(`/messages/${messageId}/location/update`, {
          method: 'POST',
          body: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      } catch (error) {
        console.error('Failed to update live location:', error);
      }
    };

    // Update every 30 seconds
    intervalRef.current = setInterval(updateLocation, 30000);
    updateLocation(); // Initial update

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [messageId, active]);

  const stopSharing = () => {
    setActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return { active, stopSharing };
}

/**
 * Reverse Geocoding
 * Convert coordinates to address using Nominatim (OpenStreetMap)
 */
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MyKipenzi-App',
        },
      }
    );

    if (!response.ok) throw new Error('Geocoding failed');

    const data = await response.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

export default ShareLocationModal;
