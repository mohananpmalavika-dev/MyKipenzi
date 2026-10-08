import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Film,
  Download,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Search,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Calendar,
  Sparkles,
  BookOpen,
  LayoutGrid,
  Share2,
  LoaderCircle,
  Play,
} from 'lucide-react';
import { api, fileBlob, downloadFile } from './api.js';
import {
  isVaultMedia,
  getMediaType,
  getPolaroidRotation,
  getPolaroidTape,
  formatPolaroidDate,
  calculateVaultStats,
  filterVaultItems,
  groupMemoriesByMonth,
  formatPolaroidShareCard,
  POLAROID_STICKERS,
  SCRAPBOOK_THEMES,
} from '../shared/mediaVault.js';

export function MediaVaultModal({
  conversation,
  user,
  onClose,
  onOpenMessage,
  onSendToChat,
  onError,
}) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(SCRAPBOOK_THEMES[0].id);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'flipbook'
  const [activeType, setActiveType] = useState('all'); // 'all' | 'photos' | 'videos' | 'starred'
  const [senderFilter, setSenderFilter] = useState('all'); // 'all' | 'me' | 'partner'
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxItem, setLightboxItem] = useState(null);
  const [flipIndex, setFlipIndex] = useState(0);
  const [blobCache, setBlobCache] = useState({});
  const [lovedIds, setLovedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`kipenzi_vault_loved_${conversation.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const blobUrlsRef = useRef(new Map());

  // Save loved polaroids
  const toggleLove = (id, e) => {
    if (e) e.stopPropagation();
    setLovedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`kipenzi_vault_loved_${conversation.id}`, JSON.stringify(next));
      } catch {
        void 0;
      }
      return next;
    });
  };

  // Fetch media from server vault endpoint with fallback to library
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');

    const loadVault = async () => {
      try {
        let items = [];
        try {
          const res = await api(`/conversations/${conversation.id}/vault?limit=100`);
          items = res.messages || [];
        } catch {
          // Fallback to library query
          const res = await api(`/conversations/${conversation.id}/library?kind=media`);
          items = res.messages || [];
        }

        if (!active) return;
        // Filter strictly for valid vault media
        const valid = items.filter((m) => m && m.attachment && isVaultMedia(m.attachment));
        setMessages(valid);
      } catch (err) {
        if (active) {
          setError(err.message);
          if (onError) onError(err.message);
        }
      } finally {
        if (active) setBusy(false);
      }
    };

    loadVault();

    const currentBlobUrls = blobUrlsRef.current;
    return () => {
      active = false;
      // Revoke created blob URLs
      for (const url of currentBlobUrls.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          void 0;
        }
      }
      currentBlobUrls.clear();
    };
  }, [conversation.id, onError]);

  // Lazy load image/video blob
  const getBlobUrl = (attachmentId) => {
    if (blobUrlsRef.current.has(attachmentId)) {
      return blobUrlsRef.current.get(attachmentId);
    }
    if (!blobCache[attachmentId]) {
      fileBlob(attachmentId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          blobUrlsRef.current.set(attachmentId, url);
          setBlobCache((prev) => ({ ...prev, [attachmentId]: url }));
        })
        .catch(() => {
          void 0;
        });
    }
    return blobCache[attachmentId] || null;
  };

  // Determine sender filter ID
  const selectedSenderId =
    senderFilter === 'me'
      ? user.id
      : senderFilter === 'partner' && conversation.peer
        ? conversation.peer.id
        : null;

  // Filtered list
  const filteredMessages = filterVaultItems(messages, {
    type: activeType === 'starred' ? 'all' : activeType,
    senderId: selectedSenderId,
    query: searchQuery,
    onlyStarred: activeType === 'starred',
  });

  const monthGroups = groupMemoriesByMonth(filteredMessages);
  const stats = calculateVaultStats(messages);

  // Flipbook navigation
  const currentFlipItem = filteredMessages[flipIndex] || null;
  const prevFlip = () => setFlipIndex((i) => Math.max(0, i - 1));
  const nextFlip = () => setFlipIndex((i) => Math.min(filteredMessages.length - 1, i + 1));

  // Lightbox navigation
  const currentLightboxIndex = lightboxItem
    ? filteredMessages.findIndex((m) => m.id === lightboxItem.id)
    : -1;

  const prevLightbox = (e) => {
    if (e) e.stopPropagation();
    if (currentLightboxIndex > 0) {
      setLightboxItem(filteredMessages[currentLightboxIndex - 1]);
    }
  };

  const nextLightbox = (e) => {
    if (e) e.stopPropagation();
    if (currentLightboxIndex < filteredMessages.length - 1) {
      setLightboxItem(filteredMessages[currentLightboxIndex + 1]);
    }
  };

  // Keyboard shortcut for lightbox & flipbook
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightboxItem) setLightboxItem(null);
        else onClose();
      } else if (e.key === 'ArrowLeft') {
        if (lightboxItem) {
          if (currentLightboxIndex > 0) setLightboxItem(filteredMessages[currentLightboxIndex - 1]);
        } else if (viewMode === 'flipbook') {
          setFlipIndex((i) => Math.max(0, i - 1));
        }
      } else if (e.key === 'ArrowRight') {
        if (lightboxItem) {
          if (currentLightboxIndex < filteredMessages.length - 1) {
            setLightboxItem(filteredMessages[currentLightboxIndex + 1]);
          }
        } else if (viewMode === 'flipbook') {
          setFlipIndex((i) => Math.min(filteredMessages.length - 1, i + 1));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxItem, currentLightboxIndex, filteredMessages, viewMode, onClose]);

  const currentThemeObj = SCRAPBOOK_THEMES.find((t) => t.id === theme) || SCRAPBOOK_THEMES[0];

  return (
    <div className="media-vault-overlay" role="dialog" aria-modal="true" aria-label="Shared Media Vault & Scrapbook">
      <div className={`media-vault-container ${currentThemeObj.bgClass}`}>
        {/* Top Header */}
        <header className="media-vault-header">
          <div className="media-vault-title-wrap">
            <div className="media-vault-badge">
              <Camera size={18} className="media-vault-badge-icon" />
              <span>Private Scrapbook · സ്വകാര്യ ആൽബം</span>
            </div>
            <h2>
              Shared Media Vault <span className="media-vault-heart-symbol">🤍</span>
            </h2>
            <p className="media-vault-subtitle">
              ചാറ്റിൽ അയച്ച പ്രിയപ്പെട്ട ഫോട്ടോകളും വീഡിയോകളും · Polaroid Memory Album
            </p>
          </div>

          <div className="media-vault-header-actions">
            {/* Theme Picker */}
            <div className="media-vault-theme-selector" title="Scrapbook table theme">
              <Sparkles size={15} />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                aria-label="Scrapbook background theme"
              >
                {SCRAPBOOK_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelMl} ({t.labelEn})
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher: Grid vs Flipbook */}
            <div className="media-vault-view-toggle" role="group" aria-label="Display style">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Polaroid Scrapbook Wall (ഗ്രിഡ്)"
              >
                <LayoutGrid size={16} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'flipbook' ? 'active' : ''}`}
                onClick={() => setViewMode('flipbook')}
                title="Storybook Flipbook (ആൽബം ബുക്ക്)"
              >
                <BookOpen size={16} />
                <span>Flipbook</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              className="media-vault-close-btn"
              onClick={onClose}
              aria-label="Close Scrapbook Vault"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Stats Strip */}
        <div className="media-vault-stats-bar">
          <div className="vault-stat-item">
            <span className="vault-stat-num">{stats.total}</span>
            <span className="vault-stat-lbl">Memories (ആകെ ഓർമ്മകൾ)</span>
          </div>
          <div className="vault-stat-divider" />
          <div className="vault-stat-item">
            <Camera size={14} className="vault-stat-icon photo" />
            <span className="vault-stat-num">{stats.photos}</span>
            <span className="vault-stat-lbl">Photos (ഫോട്ടോകൾ)</span>
          </div>
          <div className="vault-stat-divider" />
          <div className="vault-stat-item">
            <Film size={14} className="vault-stat-icon video" />
            <span className="vault-stat-num">{stats.videos}</span>
            <span className="vault-stat-lbl">Videos (വീഡിയോകൾ)</span>
          </div>
          {stats.oldestDate && (
            <>
              <div className="vault-stat-divider" />
              <div className="vault-stat-item">
                <Calendar size={14} className="vault-stat-icon calendar" />
                <span className="vault-stat-lbl">
                  First captured: <strong>{formatPolaroidDate(stats.oldestDate, user?.language || 'ml').short}</strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="media-vault-filter-bar">
          {/* Media Type Tabs */}
          <div className="vault-type-tabs" role="group" aria-label="Media category">
            <button
              type="button"
              className={`vault-tab-btn ${activeType === 'all' ? 'active' : ''}`}
              onClick={() => setActiveType('all')}
            >
              <span>All (എല്ലാം)</span>
              <span className="vault-tab-count">{stats.total}</span>
            </button>
            <button
              type="button"
              className={`vault-tab-btn ${activeType === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveType('photos')}
            >
              <Camera size={14} />
              <span>Photos (ഫോട്ടോകൾ)</span>
              <span className="vault-tab-count">{stats.photos}</span>
            </button>
            <button
              type="button"
              className={`vault-tab-btn ${activeType === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveType('videos')}
            >
              <Film size={14} />
              <span>Videos (വീഡിയോകൾ)</span>
              <span className="vault-tab-count">{stats.videos}</span>
            </button>
            <button
              type="button"
              className={`vault-tab-btn ${activeType === 'starred' ? 'active' : ''}`}
              onClick={() => setActiveType('starred')}
            >
              <Star size={14} />
              <span>Starred (പ്രിയപ്പെട്ടവ)</span>
            </button>
          </div>

          {/* Senders & Search */}
          <div className="vault-secondary-filters">
            {!conversation.is_group && (
              <div className="vault-sender-pills" role="group" aria-label="Filter by sender">
                <button
                  type="button"
                  className={`vault-pill-btn ${senderFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSenderFilter('all')}
                >
                  Both
                </button>
                <button
                  type="button"
                  className={`vault-pill-btn ${senderFilter === 'me' ? 'active' : ''}`}
                  onClick={() => setSenderFilter('me')}
                >
                  By Me (ഞാൻ)
                </button>
                <button
                  type="button"
                  className={`vault-pill-btn ${senderFilter === 'partner' ? 'active' : ''}`}
                  onClick={() => setSenderFilter('partner')}
                >
                  By {conversation.peer?.name || 'Partner'}
                </button>
              </div>
            )}

            <div className="vault-search-box">
              <Search size={15} className="vault-search-icon" />
              <input
                type="search"
                placeholder="Search captions or files… (തിരയുക)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                aria-label="Search memories"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="vault-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="media-vault-body" aria-busy={busy}>
          {busy ? (
            <div className="media-vault-loading" role="status">
              <LoaderCircle size={32} className="spin" />
              <p>Gathering your sweet memories… (ഓർമ്മകൾ തുറക്കുന്നു)</p>
            </div>
          ) : error ? (
            <div className="media-vault-error" role="alert">
              <p>{error}</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="media-vault-empty">
              <div className="vault-empty-polaroid">
                <div className="vault-empty-camera">📷</div>
                <div className="vault-empty-text">
                  <h3>No Memories Found</h3>
                  <p>
                    {searchQuery.trim()
                      ? 'No photos or videos match your search.'
                      : activeType === 'videos'
                        ? 'No videos shared in this chat yet.'
                        : activeType === 'photos'
                          ? 'No photos shared in this chat yet.'
                          : 'ചാറ്റിൽ ഫോട്ടോകളും വീഡിയോകളും അയക്കൂ, ഇവിടെ മനോഹരമായ പോളറോയ്ഡ് ആൽബമായി സൂക്ഷിക്കാം 🤍'}
                  </p>
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GRID / SCRAPBOOK WALL VIEW ================= */
            <div className="media-vault-grid-content">
              {monthGroups.map((group) => (
                <section key={group.key} className="scrapbook-month-section">
                  <div className="scrapbook-month-header">
                    <span className="scrapbook-pin-deco">📌</span>
                    <h3 className="scrapbook-month-title">
                      {group.labelMl} <span className="month-en">({group.labelEn})</span>
                    </h3>
                    <span className="scrapbook-month-badge">
                      {group.items.length} {group.items.length === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>

                  <div className="scrapbook-polaroids-wall">
                    {group.items.map((item, idx) => (
                      <PolaroidCard
                        key={item.id}
                        item={item}
                        user={user}
                        rotation={getPolaroidRotation(item.id)}
                        tapeClass={getPolaroidTape(item.id)}
                        sticker={POLAROID_STICKERS[idx % POLAROID_STICKERS.length]}
                        previewUrl={getBlobUrl(item.attachment.id)}
                        isLoved={Boolean(lovedIds[item.id])}
                        onToggleLove={(e) => toggleLove(item.id, e)}
                        onClick={() => setLightboxItem(item)}
                        onOpenMessage={onOpenMessage}
                        onError={onError}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            /* ================= FLIPBOOK / STORYBOOK MODE ================= */
            <div className="media-vault-flipbook-content">
              {currentFlipItem && (
                <div className="flipbook-stage">
                  <div className="flipbook-nav-btn prev">
                    <button
                      type="button"
                      disabled={flipIndex === 0}
                      onClick={prevFlip}
                      aria-label="Previous memory"
                    >
                      <ChevronLeft size={28} />
                    </button>
                  </div>

                  <div className="flipbook-polaroid-container">
                    <div className="flipbook-washi-tape" />
                    <div className="flipbook-card">
                      <div className="flipbook-media-wrap">
                        {getMediaType(currentFlipItem.attachment) === 'video' ? (
                          <div className="flipbook-video-box">
                            {getBlobUrl(currentFlipItem.attachment.id) ? (
                              <video
                                src={getBlobUrl(currentFlipItem.attachment.id)}
                                controls
                                playsInline
                                className="flipbook-media"
                              />
                            ) : (
                              <div className="polaroid-loading-thumb">
                                <LoaderCircle size={28} className="spin" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="flipbook-photo-box"
                            onClick={() => setLightboxItem(currentFlipItem)}
                          >
                            {getBlobUrl(currentFlipItem.attachment.id) ? (
                              <img
                                src={getBlobUrl(currentFlipItem.attachment.id)}
                                alt={currentFlipItem.attachment.name}
                                className="flipbook-media"
                              />
                            ) : (
                              <div className="polaroid-loading-thumb">
                                <LoaderCircle size={28} className="spin" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Polaroid bottom chin */}
                      <div className="flipbook-chin">
                        <div className="flipbook-quote">
                          <span className="chin-handwritten">
                            {currentFlipItem.text
                              ? `“${currentFlipItem.text.trim()}”`
                              : `Memory with ${currentFlipItem.sender?.name || 'Partner'}`}
                          </span>
                        </div>

                        <div className="flipbook-details-row">
                          <div className="flipbook-meta-left">
                            <span className="chin-sender">
                              by {currentFlipItem.sender?.name || 'Someone special'} 🤍
                            </span>
                            <span className="chin-date">
                              {formatPolaroidDate(currentFlipItem.created_at, user?.language || 'ml').full}
                            </span>
                          </div>

                          <div className="flipbook-actions-right">
                            <button
                              type="button"
                              className={`flipbook-love-btn ${lovedIds[currentFlipItem.id] ? 'loved' : ''}`}
                              onClick={(e) => toggleLove(currentFlipItem.id, e)}
                              title="Favorite this memory"
                              aria-label="Love memory"
                            >
                              <Heart
                                size={18}
                                fill={lovedIds[currentFlipItem.id] ? 'currentColor' : 'none'}
                              />
                            </button>
                            <button
                              type="button"
                              className="flipbook-action-icon"
                              title="Download original"
                              onClick={() => void downloadFile(currentFlipItem.attachment).catch((e) => onError && onError(e.message))}
                              aria-label="Download media"
                            >
                              <Download size={18} />
                            </button>
                            {onOpenMessage && (
                              <button
                                type="button"
                                className="flipbook-action-icon"
                                title="View in Chat (ചാറ്റിൽ കാണുക)"
                                onClick={() => {
                                  onClose();
                                  onOpenMessage(currentFlipItem);
                                }}
                                aria-label="View in chat"
                              >
                                <MessageCircle size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flipbook-nav-btn next">
                    <button
                      type="button"
                      disabled={flipIndex === filteredMessages.length - 1}
                      onClick={nextFlip}
                      aria-label="Next memory"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </div>
                </div>
              )}

              {/* Flipbook index indicator */}
              <div className="flipbook-pagination">
                <span>
                  Memory {flipIndex + 1} of {filteredMessages.length}
                </span>
                <div className="flipbook-progress-track">
                  <div
                    className="flipbook-progress-fill"
                    style={{
                      width: `${((flipIndex + 1) / filteredMessages.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= LIGHTBOX / FOCUS MODAL ================= */}
        {lightboxItem && (
          <div
            className="vault-lightbox-backdrop"
            onClick={() => setLightboxItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Polaroid Focus View"
          >
            <div className="vault-lightbox-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vault-lightbox-top-toolbar">
                <span className="vault-lightbox-counter">
                  {currentLightboxIndex + 1} / {filteredMessages.length}
                </span>

                <div className="vault-lightbox-toolbar-actions">
                  {/* Share memory to chat */}
                  {onSendToChat && (
                    <button
                      type="button"
                      className="lightbox-tool-btn"
                      title="Share memory card to chat (ചാറ്റിൽ ഓർമ്മ പങ്കിടുക)"
                      onClick={() => {
                        const cardText = formatPolaroidShareCard(
                          lightboxItem,
                          lightboxItem.sender?.name || user.name
                        );
                        onSendToChat(cardText);
                        onClose();
                      }}
                    >
                      <Share2 size={16} />
                      <span>Share Memory</span>
                    </button>
                  )}

                  {/* View in chat */}
                  {onOpenMessage && (
                    <button
                      type="button"
                      className="lightbox-tool-btn"
                      title="Jump to message in chat (ചാറ്റിൽ കാണുക)"
                      onClick={() => {
                        setLightboxItem(null);
                        onClose();
                        onOpenMessage(lightboxItem);
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>View in Chat</span>
                    </button>
                  )}

                  {/* Download */}
                  <button
                    type="button"
                    className="lightbox-tool-btn"
                    title="Download original file"
                    onClick={() =>
                      void downloadFile(lightboxItem.attachment).catch(
                        (e) => onError && onError(e.message)
                      )
                    }
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>

                  {/* Close */}
                  <button
                    type="button"
                    className="lightbox-close-icon"
                    onClick={() => setLightboxItem(null)}
                    aria-label="Close focus view"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Large Centered Polaroid Mount */}
              <div className="vault-lightbox-polaroid">
                <div className="vault-lightbox-tape" />

                <div className="vault-lightbox-media-container">
                  {getMediaType(lightboxItem.attachment) === 'video' ? (
                    <div className="lightbox-video-frame">
                      {getBlobUrl(lightboxItem.attachment.id) ? (
                        <video
                          src={getBlobUrl(lightboxItem.attachment.id)}
                          controls
                          autoPlay
                          playsInline
                          className="lightbox-display-media"
                        />
                      ) : (
                        <div className="polaroid-loading-thumb">
                          <LoaderCircle size={36} className="spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="lightbox-photo-frame">
                      {getBlobUrl(lightboxItem.attachment.id) ? (
                        <img
                          src={getBlobUrl(lightboxItem.attachment.id)}
                          alt={lightboxItem.attachment.name}
                          className="lightbox-display-media"
                        />
                      ) : (
                        <div className="polaroid-loading-thumb">
                          <LoaderCircle size={36} className="spin" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Polaroid Chin */}
                <div className="vault-lightbox-chin">
                  <div className="chin-handwritten-note">
                    {lightboxItem.text ? (
                      <p className="chin-note-text">“{lightboxItem.text.trim()}”</p>
                    ) : (
                      <p className="chin-note-placeholder">
                        Captured with love · {conversation.title || 'Us'}
                      </p>
                    )}
                  </div>

                  <div className="chin-bottom-bar">
                    <div className="chin-sender-info">
                      <span className="chin-sender-tag">
                        Sent by <strong>{lightboxItem.sender?.name || 'Someone special'}</strong>
                      </span>
                      <span className="chin-datetime">
                        {formatPolaroidDate(lightboxItem.created_at, user?.language || 'ml').full}
                      </span>
                    </div>

                    <div className="chin-interactions">
                      <button
                        type="button"
                        className={`chin-heart-btn ${lovedIds[lightboxItem.id] ? 'active' : ''}`}
                        onClick={(e) => toggleLove(lightboxItem.id, e)}
                        aria-label="Favorite memory"
                      >
                        <Heart
                          size={20}
                          fill={lovedIds[lightboxItem.id] ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prev / Next Nav Chevrons */}
              {currentLightboxIndex > 0 && (
                <button
                  type="button"
                  className="lightbox-arrow-btn left"
                  onClick={prevLightbox}
                  aria-label="Previous snapshot"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              {currentLightboxIndex < filteredMessages.length - 1 && (
                <button
                  type="button"
                  className="lightbox-arrow-btn right"
                  onClick={nextLightbox}
                  aria-label="Next snapshot"
                >
                  <ChevronRight size={32} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Polaroid Snapshot Component
 */
function PolaroidCard({
  item,
  user,
  rotation,
  tapeClass,
  sticker,
  previewUrl,
  isLoved,
  onToggleLove,
  onClick,
  onOpenMessage,
  onError,
}) {
  const isVideo = getMediaType(item.attachment) === 'video';
  const dateObj = formatPolaroidDate(item.created_at, user?.language || 'ml');

  return (
    <article
      className="polaroid-snapshot-card"
      style={{ '--polaroid-rotate': `${rotation}deg` }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Polaroid memory: ${item.text || item.attachment.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Tape decoration */}
      <div className={`polaroid-washi-tape ${tapeClass}`} />

      {/* Cute corner sticker */}
      <span className="polaroid-sticker-stamp" title="Memory stamp">
        {sticker}
      </span>

      {/* Photo / Video preview frame */}
      <div className="polaroid-media-frame">
        {previewUrl ? (
          isVideo ? (
            <div className="polaroid-video-preview">
              <video src={previewUrl} preload="metadata" muted playsInline />
              <div className="polaroid-video-badge">
                <Play size={13} fill="currentColor" />
                <span>VIDEO</span>
              </div>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt={item.attachment.name}
              loading="lazy"
              className="polaroid-image-thumb"
            />
          )
        ) : (
          <div className="polaroid-loading-thumb">
            <LoaderCircle size={22} className="spin" />
          </div>
        )}

        {/* Floating Quick Action overlay */}
        <div className="polaroid-hover-overlay">
          <button
            type="button"
            className="polaroid-hover-btn"
            title="Inspect in Focus Mode"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Maximize2 size={16} />
          </button>
          <button
            type="button"
            className="polaroid-hover-btn"
            title="Download"
            onClick={(e) => {
              e.stopPropagation();
              void downloadFile(item.attachment).catch((err) => onError && onError(err.message));
            }}
          >
            <Download size={16} />
          </button>
          {onOpenMessage && (
            <button
              type="button"
              className="polaroid-hover-btn"
              title="View in Chat (ചാറ്റിൽ കാണുക)"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMessage(item);
              }}
            >
              <MessageCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Polaroid Chin with Handwritten Caption & Date */}
      <div className="polaroid-chin">
        <div className="polaroid-caption-wrap">
          {item.text ? (
            <p className="polaroid-handwritten-caption">“{item.text.trim()}”</p>
          ) : (
            <p className="polaroid-default-caption">
              {isVideo ? 'Captured Video 🎥' : 'Love Snapshot 🤍'}
            </p>
          )}
        </div>

        <div className="polaroid-footer-meta">
          <div className="polaroid-meta-left">
            <time className="polaroid-date-stamp" dateTime={item.created_at}>
              {dateObj.short}
            </time>
            <span className="polaroid-sender-name">
              · {item.sender?.name || 'Partner'}
            </span>
          </div>

          <button
            type="button"
            className={`polaroid-love-icon ${isLoved ? 'loved' : ''}`}
            onClick={onToggleLove}
            title={isLoved ? 'Unfavorite' : 'Favorite'}
            aria-label="Toggle favorite"
          >
            <Heart size={15} fill={isLoved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
