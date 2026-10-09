import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ticket,
  Heart,
  Sparkles,
  Gift,
  Dices,
  Plus,
  Trash2,
  Share2,
  X,
  CheckCircle2,
  Calendar,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Send,
  PartyPopper,
  Flame,
  Award,
  Compass,
  Smile,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import { api } from './api.js';
import {
  LOVE_COUPON_PRESETS,
  BUCKET_LIST_PRESETS,
  BUCKET_LIST_CATEGORIES,
  DATE_NIGHT_IDEAS,
  DATE_NIGHT_CATEGORIES,
  formatCouponRedeemedShare,
  formatBucketCompletedShare,
  formatDateWheelPickShare,
} from '../shared/romanticSurprises.js';
import {
  playScratchSound,
  playWheelTickSound,
  playRomanticCelebrationChime,
} from './romanticAudio.js';
import './romantic-surprises.css';

/**
 * Interactive Scratch Card Canvas Overlay
 */
function ScratchCardOverlay({ couponId, onRevealed, isAlreadyScratched }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const scratched = useRef(isAlreadyScratched);
  const lastSoundTime = useRef(0);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Metallic holographic silver-pink gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#c084fc');
    grad.addColorStop(0.3, '#f472b6');
    grad.addColorStop(0.6, '#e2e8f0');
    grad.addColorStop(1, '#ec4899');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle sparkles/stars pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 40; i++) {
      const rx = (Math.sin(i * 99) * 0.5 + 0.5) * width;
      const ry = (Math.cos(i * 33) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(rx, ry, (i % 3) + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text instructions
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Scratch here with love ✨', width / 2, height / 2 - 12);
    ctx.font = '13px sans-serif';
    ctx.fillText('🪙 ഇവിടെ സ്ക്രാച്ച് ചെയ്യുക 🪙', width / 2, height / 2 + 12);
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    if (!isAlreadyScratched) {
      initCanvas();
    }
  }, [initCanvas, isAlreadyScratched]);

  const checkScratchPercentage = () => {
    if (scratched.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentCount = 0;
    const totalPixels = pixels.length / 4;

    // Sample every 4th pixel for speed
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 40) {
        transparentCount++;
      }
    }
    const sampleTotal = totalPixels / 4;
    const ratio = transparentCount / sampleTotal;

    if (ratio > 0.42) {
      scratched.current = true;
      onRevealed();
    }
  };

  const scratchAt = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas || scratched.current) return;
    const ctx = canvas.getContext('2d');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    const now = Date.now();
    if (now - lastSoundTime.current > 80) {
      playScratchSound();
      lastSoundTime.current = now;
    }

    checkScratchPercentage();
  };

  const handlePointerDown = (e) => {
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scratchAt(x, y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scratchAt(x, y);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
  };

  if (isAlreadyScratched) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="scratch-canvas"
      width={340}
      height={140}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

/**
 * Confetti Canvas for Festive Particles
 */
function ConfettiCanvas({ trigger }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#ec4899', '#f472b6', '#a855f7', '#fbbf24', '#34d399', '#60a5fa', '#f43f5e'];
    const emojis = ['💖', '✨', '🎟️', '🎉', '🌟', '🥰'];
    const particles = [];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 160,
        y: canvas.height / 3 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: Math.random() > 0.6 ? emojis[Math.floor(Math.random() * emojis.length)] : null,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.007;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = Math.max(0, p.alpha);

          if (p.emoji) {
            ctx.font = `${p.size * 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, 0, 0);
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [trigger]);

  return <canvas ref={canvasRef} className="romantic-confetti-canvas" />;
}

export function RomanticSurprisesModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError,
}) {
  const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' | 'bucketlist' | 'datewheel'
  const [coupons, setCoupons] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Confetti trigger tick
  const [confettiTick, setConfettiTick] = useState(0);

  // Coupons Sub-view
  const [couponFilter, setCouponFilter] = useState('received'); // 'received' | 'sent'
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🎟️');
  const [customDesc, setCustomDesc] = useState('');
  const [scratchedIds, setScratchedIds] = useState(new Set());

  // Bucket List State
  const [bucketCategory, setBucketCategory] = useState('all');
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [bucketTitle, setBucketTitle] = useState('');
  const [bucketCat, setBucketCat] = useState('travel');
  const [bucketNotes, setBucketNotes] = useState('');
  const [bucketTargetDate, setBucketTargetDate] = useState('');

  // Completing Bucket Item Dialog
  const [completingItemId, setCompletingItemId] = useState(null);
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [completionNote, setCompletionNote] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const fileInputRef = useRef(null);

  // Date Night Wheel State
  const [wheelCategory, setWheelCategory] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winnerIdea, setWinnerIdea] = useState(null);
  const wheelCanvasRef = useRef(null);
  const spinVelocity = useRef(0);
  const lastTickAngle = useRef(0);

  // Filtered Date Night Ideas
  const filteredDateIdeas = DATE_NIGHT_IDEAS.filter(
    (item) => wheelCategory === 'all' || item.category === wheelCategory
  );

  // Load Data
  const loadSurprises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/conversations/${conversationId}/romantic-surprises`);
      if (res) {
        setCoupons(res.coupons || []);
        setBucketList(res.bucketList || []);
      }
    } catch {
      // Fallback offline / local demo presets
      setCoupons(
        LOVE_COUPON_PRESETS.slice(0, 4).map((p, idx) => ({
          id: p.id,
          conversation_id: conversationId,
          sender_id: idx % 2 === 0 ? peer?.user_id : user.id,
          sender_name: idx % 2 === 0 ? peer?.name : user.name,
          recipient_id: idx % 2 === 0 ? user.id : peer?.user_id,
          recipient_name: idx % 2 === 0 ? user.name : peer?.name,
          title: p.title,
          emoji: p.emoji,
          description: p.description,
          status: 'active',
          scratch_percentage: 0,
          created_at: new Date().toISOString(),
        }))
      );
      setBucketList(
        BUCKET_LIST_PRESETS.slice(0, 6).map((b, idx) => ({
          id: b.id,
          conversation_id: conversationId,
          creator_id: user.id,
          creator_name: user.name,
          title: b.title,
          category: b.category,
          notes: b.notes,
          target_date: 'Soon',
          is_completed: idx === 0,
          completed_at: idx === 0 ? new Date().toISOString() : null,
          completed_by: idx === 0 ? user.id : null,
          completed_by_name: idx === 0 ? user.name : null,
          completion_note: idx === 0 ? 'നമ്മുടെ ഏറ്റവും പ്രിയപ്പെട്ട യാത്ര! 💖' : '',
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, peer?.name, peer?.user_id, user.id, user.name]);

  useEffect(() => {
    void loadSurprises();
  }, [loadSurprises]);

  // Socket listener for real-time actions
  useEffect(() => {
    if (!socket) return;
    const handleAction = (payload) => {
      if (payload.conversation_id !== conversationId) return;

      if (payload.type === 'coupon_created') {
        setCoupons((prev) => [payload.coupon, ...prev.filter((c) => c.id !== payload.coupon.id)]);
      } else if (payload.type === 'coupon_updated') {
        setCoupons((prev) =>
          prev.map((c) => (c.id === payload.coupon.id ? payload.coupon : c))
        );
        if (payload.coupon.status === 'redeemed') {
          setConfettiTick((t) => t + 1);
          playRomanticCelebrationChime();
        }
      } else if (payload.type === 'coupon_deleted') {
        setCoupons((prev) => prev.filter((c) => c.id !== payload.coupon_id));
      } else if (payload.type === 'bucket_added') {
        setBucketList((prev) => [payload.item, ...prev]);
      } else if (payload.type === 'bucket_updated') {
        setBucketList((prev) =>
          prev.map((b) => (b.id === payload.item.id ? payload.item : b))
        );
        if (payload.item.is_completed) {
          setConfettiTick((t) => t + 1);
          playRomanticCelebrationChime();
        }
      } else if (payload.type === 'bucket_deleted') {
        setBucketList((prev) => prev.filter((b) => b.id !== payload.item_id));
      }
    };

    socket.on('romantic:action', handleAction);
    return () => socket.off('romantic:action', handleAction);
  }, [conversationId, socket]);

  // ==============================================================
  // LOVE COUPONS ACTIONS
  // ==============================================================
  const handleGiftPresetCoupon = async (preset) => {
    try {
      const res = await api(`/conversations/${conversationId}/romantic-surprises/coupons`, {
        method: 'POST',
        body: {
          title: preset.title,
          emoji: preset.emoji,
          description: preset.description,
          recipient_id: peer?.user_id,
        },
      });
      if (res?.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
      }
      setShowAddCoupon(false);
      setConfettiTick((t) => t + 1);
      playRomanticCelebrationChime();
      if (onSendToChat) {
        onSendToChat(`🎟️✨ Gifted you a Love Coupon: "${preset.title}"! Open Romantic Surprises to scratch and redeem! 💖`);
      }
    } catch (e) {
      onError?.(e.message);
    }
  };

  const handleCreateCustomCoupon = async (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    try {
      const res = await api(`/conversations/${conversationId}/romantic-surprises/coupons`, {
        method: 'POST',
        body: {
          title: customTitle.trim(),
          emoji: customEmoji || '🎟️',
          description: customDesc.trim(),
          recipient_id: peer?.user_id,
        },
      });
      if (res?.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
      }
      setCustomTitle('');
      setCustomDesc('');
      setShowAddCoupon(false);
      setConfettiTick((t) => t + 1);
      playRomanticCelebrationChime();
      if (onSendToChat) {
        onSendToChat(`🎟️✨ Created a special Love Coupon for you: "${customTitle.trim()}" ${customEmoji}! 💖`);
      }
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleRedeemCoupon = async (coupon) => {
    try {
      const res = await api(
        `/conversations/${conversationId}/romantic-surprises/coupons/${coupon.id}`,
        {
          method: 'PATCH',
          body: { status: 'redeemed' },
        }
      );
      if (res?.coupon) {
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? res.coupon : c)));
      }
      setConfettiTick((t) => t + 1);
      playRomanticCelebrationChime();
      if (onSendToChat) {
        onSendToChat(formatCouponRedeemedShare(coupon, user.name));
      }
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    try {
      await api(`/conversations/${conversationId}/romantic-surprises/coupons/${couponId}`, {
        method: 'DELETE',
      });
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } catch (err) {
      onError?.(err.message);
    }
  };

  // ==============================================================
  // BUCKET LIST ACTIONS
  // ==============================================================
  const handleAddBucketItem = async (e) => {
    e.preventDefault();
    if (!bucketTitle.trim()) return;

    try {
      const res = await api(`/conversations/${conversationId}/romantic-surprises/bucket-list`, {
        method: 'POST',
        body: {
          title: bucketTitle.trim(),
          category: bucketCat,
          notes: bucketNotes.trim(),
          target_date: bucketTargetDate || 'Soon',
        },
      });
      if (res?.item) {
        setBucketList((prev) => [res.item, ...prev]);
      }
      setBucketTitle('');
      setBucketNotes('');
      setBucketTargetDate('');
      setShowAddBucket(false);
      setConfettiTick((t) => t + 1);
      playRomanticCelebrationChime();
      if (onSendToChat) {
        onSendToChat(`✈️✨ Added a new dream to our Bucket List: "${bucketTitle.trim()}"! Let's make it happen together! 💖`);
      }
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleCompleteBucketItem = async (itemId) => {
    try {
      const res = await api(
        `/conversations/${conversationId}/romantic-surprises/bucket-list/${itemId}`,
        {
          method: 'PATCH',
          body: {
            is_completed: true,
            completion_photo: completionPhoto,
            completion_note: completionNote.trim(),
          },
        }
      );
      if (res?.item) {
        setBucketList((prev) => prev.map((b) => (b.id === itemId ? res.item : b)));
        const item = res.item;
        if (onSendToChat) {
          onSendToChat(formatBucketCompletedShare(item, user.name, completionDate));
        }
      }
      setCompletingItemId(null);
      setCompletionPhoto(null);
      setCompletionNote('');
      setConfettiTick((t) => t + 1);
      playRomanticCelebrationChime();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleDeleteBucketItem = async (itemId) => {
    try {
      await api(`/conversations/${conversationId}/romantic-surprises/bucket-list/${itemId}`, {
        method: 'DELETE',
      });
      setBucketList((prev) => prev.filter((b) => b.id !== itemId));
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCompletionPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ==============================================================
  // DATE NIGHT WHEEL ACTIONS & DRAWING
  // ==============================================================
  const drawWheel = useCallback((rotationAngle) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 6;

    ctx.clearRect(0, 0, width, height);

    const sliceColors = [
      '#ec4899', '#a855f7', '#3b82f6', '#10b981',
      '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4',
    ];

    const count = filteredDateIdeas.length || 1;
    const arc = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationAngle);

    for (let i = 0; i < count; i++) {
      const angle = i * arc;
      const idea = filteredDateIdeas[i];

      // Draw slice
      ctx.beginPath();
      ctx.fillStyle = sliceColors[i % sliceColors.length];
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.lineTo(0, 0);
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text and emoji
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;

      const title = idea?.emoji
        ? `${idea.emoji} ${(idea.titleMl || idea.titleEn).slice(0, 14)}...`
        : `Idea ${i + 1}`;
      ctx.fillText(title, radius - 16, 5);
      ctx.restore();
    }

    ctx.restore();
  }, [filteredDateIdeas]);

  useEffect(() => {
    drawWheel(wheelRotation);
  }, [drawWheel, wheelRotation]);

  const spinWheel = () => {
    if (isSpinning || filteredDateIdeas.length === 0) return;
    setIsSpinning(true);
    setWinnerIdea(null);

    // Initial speed: randomized between 0.35 and 0.55 radians/frame
    spinVelocity.current = Math.random() * 0.2 + 0.38;
    let currentAngle = wheelRotation;
    lastTickAngle.current = currentAngle;

    const sliceAngle = (Math.PI * 2) / filteredDateIdeas.length;

    const animateSpin = () => {
      currentAngle += spinVelocity.current;
      setWheelRotation(currentAngle);
      drawWheel(currentAngle);

      // Play click sound as pointer crosses slice borders
      if (Math.abs(currentAngle - lastTickAngle.current) >= sliceAngle) {
        playWheelTickSound();
        lastTickAngle.current = currentAngle;
      }

      // Decelerate smoothly
      spinVelocity.current *= 0.985;

      if (spinVelocity.current < 0.002) {
        setIsSpinning(false);

        // Normalize angle to find winning slice under pointer (at top: 3*PI/2)
        const normalizedAngle = (Math.PI * 2 - (currentAngle % (Math.PI * 2)) + Math.PI * 1.5) % (Math.PI * 2);
        const winningIndex = Math.floor(normalizedAngle / sliceAngle) % filteredDateIdeas.length;
        const winner = filteredDateIdeas[winningIndex];

        setWinnerIdea(winner);
        setConfettiTick((t) => t + 1);
        playRomanticCelebrationChime();
      } else {
        requestAnimationFrame(animateSpin);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  // Share winner pick to chat
  const handleShareWinnerIdea = () => {
    if (!winnerIdea || !onSendToChat) return;
    onSendToChat(formatDateWheelPickShare(winnerIdea, user.name));
  };

  // Add winner to couple bucket list
  const handleAddWinnerToBucket = async () => {
    if (!winnerIdea) return;
    try {
      const res = await api(`/conversations/${conversationId}/romantic-surprises/bucket-list`, {
        method: 'POST',
        body: {
          title: winnerIdea.titleMl || winnerIdea.titleEn,
          category: winnerIdea.category === 'in_house' ? 'cozy' : 'romantic',
          notes: winnerIdea.descMl || winnerIdea.descEn,
          target_date: 'Tonight',
        },
      });
      if (res?.item) {
        setBucketList((prev) => [res.item, ...prev]);
        setConfettiTick((t) => t + 1);
        playRomanticCelebrationChime();
        if (onSendToChat) {
          onSendToChat(`✈️✨ Added tonight's date idea to our Bucket List: "${winnerIdea.titleMl || winnerIdea.titleEn}"! 💖`);
        }
      }
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Filter coupons
  const displayedCoupons = coupons.filter((c) =>
    couponFilter === 'received' ? c.recipient_id === user.id : c.sender_id === user.id
  );

  // Filter bucket list
  const displayedBucket = bucketList.filter((b) =>
    bucketCategory === 'all'
      ? true
      : bucketCategory === 'completed'
      ? b.is_completed
      : b.category === bucketCategory
  );

  const completedCount = bucketList.filter((b) => b.is_completed).length;
  const totalBucket = bucketList.length || 1;
  const bucketPct = Math.round((completedCount / totalBucket) * 100);

  return (
    <div className="romantic-modal-overlay" onClick={onClose}>
      <div className="romantic-modal-container" onClick={(e) => e.stopPropagation()}>
        <ConfettiCanvas trigger={confettiTick} />

        {/* Modal Header */}
        <div className="romantic-modal-header">
          <div className="romantic-header-title-box">
            <div className="romantic-header-icon">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="romantic-header-title">
                റൊമാന്റിക് സർപ്രൈസുകളും ക്യൂട്ട് ഗിഫ്റ്റിംഗും ✨
              </h2>
              <div className="romantic-header-subtitle">
                Love Coupons · Couple Bucket List · Surprise Date Night Wheel 💖
              </div>
            </div>
          </div>
          <ButtonIcon label="Close" onClick={onClose}>
            <X size={20} />
          </ButtonIcon>
        </div>

        {/* Navigation Tabs */}
        <div className="romantic-tabs-nav">
          <button
            type="button"
            className={`romantic-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
            onClick={() => setActiveTab('coupons')}
          >
            <Ticket size={18} />
            പ്രണയ കൂപ്പണുകൾ (Love Coupons 🎟️)
          </button>
          <button
            type="button"
            className={`romantic-tab-btn ${activeTab === 'bucketlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('bucketlist')}
          >
            <Compass size={18} />
            നമ്മുടെ സ്വപ്നങ്ങളുടെ പട്ടിക (Bucket List ✈️)
          </button>
          <button
            type="button"
            className={`romantic-tab-btn ${activeTab === 'datewheel' ? 'active' : ''}`}
            onClick={() => setActiveTab('datewheel')}
          >
            <Dices size={18} />
            ഡേറ്റ് നൈറ്റ് ഐഡിയ വീൽ (Date Night Wheel 🎲)
          </button>
        </div>

        {/* Body Content */}
        <div className="romantic-modal-body">
          {/* ==============================================================
              TAB 1: LOVE COUPONS / SCRATCH CARDS
              ============================================================== */}
          {activeTab === 'coupons' && (
            <div>
              <div className="romantic-subnav">
                <div className="romantic-chips-row">
                  <button
                    type="button"
                    className={`romantic-chip ${couponFilter === 'received' ? 'active' : ''}`}
                    onClick={() => setCouponFilter('received')}
                  >
                    എനിക്ക് ലഭിച്ചവ (For Me) 🎁 ({coupons.filter((c) => c.recipient_id === user.id).length})
                  </button>
                  <button
                    type="button"
                    className={`romantic-chip ${couponFilter === 'sent' ? 'active' : ''}`}
                    onClick={() => setCouponFilter('sent')}
                  >
                    ഞാൻ നൽകിയവ (Sent by Me) 💌 ({coupons.filter((c) => c.sender_id === user.id).length})
                  </button>
                </div>
                <button
                  type="button"
                  className="romantic-primary-btn"
                  onClick={() => setShowAddCoupon(!showAddCoupon)}
                >
                  <Plus size={16} />
                  {showAddCoupon ? 'ക്ലോസ് ചെയ്യുക' : '+ പുതിയ കൂപ്പൺ നൽകാം (Gift Coupon)'}
                </button>
              </div>

              {/* Gift a Coupon Tray / Form */}
              {showAddCoupon && (
                <div className="presets-tray">
                  <div className="presets-tray-title">
                    <Gift size={18} />
                    ക്വിക്ക് പ്രിസെറ്റ് കൂപ്പണുകൾ (Quick Gift Presets 🎟️):
                  </div>
                  <div className="presets-grid">
                    {LOVE_COUPON_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="preset-chip-card"
                        onClick={() => handleGiftPresetCoupon(preset)}
                      >
                        <span style={{ fontSize: '1.4rem' }}>{preset.emoji}</span>
                        <div>
                          <div className="preset-chip-title">{preset.titleMl}</div>
                          <div style={{ fontSize: '0.72rem', color: '#fbcfe8', opacity: 0.8 }}>
                            {preset.title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Coupon Form */}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed rgba(244,114,182,0.2)' }}>
                    <div className="presets-tray-title">
                      <Sparkles size={16} />
                      കസ്റ്റം കൂപ്പൺ ഉണ്ടാക്കുക (Create Custom Coupon):
                    </div>
                    <form onSubmit={handleCreateCustomCoupon}>
                      <div className="custom-form-row">
                        <label className="custom-form-label">കൂപ്പൺ ടൈറ്റിൽ (Coupon Title):</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            style={{ width: '60px', textAlign: 'center' }}
                            className="custom-form-input"
                            value={customEmoji}
                            onChange={(e) => setCustomEmoji(e.target.value)}
                            placeholder="Emoji"
                          />
                          <input
                            type="text"
                            className="custom-form-input"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="ഉദാ: '10-Minute Virtual Hug with no complaints 🫂'"
                            required
                          />
                        </div>
                      </div>
                      <div className="custom-form-row">
                        <label className="custom-form-label">സ്നേഹക്കുറിപ്പ് / നിർദ്ദേശങ്ങൾ (Sweet Note):</label>
                        <textarea
                          rows={2}
                          className="custom-form-textarea"
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          placeholder="ഈ കൂപ്പൺ റിഡീം ചെയ്യുമ്പോൾ എന്ത് സ്പെഷ്യൽ കാര്യമാണ് നൽകുക..."
                        />
                      </div>
                      <button type="submit" className="romantic-primary-btn">
                        <Gift size={16} />
                        പങ്കാളിക്ക് അയക്കുക (Send Coupon to Partner 💌)
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Coupons List */}
              {displayedCoupons.length === 0 ? (
                <div className="romantic-empty-box">
                  <div className="romantic-empty-emoji">🎟️✨</div>
                  <p>
                    {couponFilter === 'received'
                      ? 'നിങ്ങൾക്ക് ഇതുവരെ കൂപ്പണുകൾ ലഭിച്ചിട്ടില്ല. പങ്കാളിക്ക് ഒരു കൂപ്പൺ സമ്മാനിക്കൂ!'
                      : 'നിങ്ങൾ ഇതുവരെ പങ്കാളിക്ക് കൂപ്പണുകൾ നൽകിയിട്ടില്ല. മുകളിലെ ബട്ടൺ അമർത്തി നൽകൂ!'}
                  </p>
                </div>
              ) : (
                <div className="love-coupons-grid">
                  {displayedCoupons.map((coupon) => {
                    const isForMe = coupon.recipient_id === user.id;
                    const isRedeemed = coupon.status === 'redeemed';
                    const isScratched = isRedeemed || scratchedIds.has(coupon.id);

                    return (
                      <div
                        key={coupon.id}
                        className={`love-coupon-card ${isRedeemed ? 'redeemed' : ''}`}
                      >
                        <div className="love-coupon-header">
                          <div className="love-coupon-icon-box">{coupon.emoji}</div>
                          <span
                            className={`love-coupon-badge ${isRedeemed ? 'claimed' : 'ready'}`}
                          >
                            {isRedeemed ? '✨ Redeemed / റിഡീം ചെയ്തു' : '🎟️ Valid Anytime'}
                          </span>
                        </div>

                        <h3 className="love-coupon-title">{coupon.title}</h3>
                        <p className="love-coupon-desc">{coupon.description}</p>

                        {/* Interactive Scratch Area for received coupons */}
                        {isForMe && !isRedeemed && (
                          <div className="scratch-card-wrapper">
                            <div className="scratch-revealed-content">
                              <span style={{ fontSize: '2rem' }}>💖</span>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                                Surprise Unlocked! 🎉
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#fbcfe8' }}>
                                Click below to claim & redeem anytime!
                              </div>
                            </div>
                            <ScratchCardOverlay
                              couponId={coupon.id}
                              isAlreadyScratched={isScratched}
                              onRevealed={() => {
                                setScratchedIds((prev) => new Set(prev).add(coupon.id));
                                setConfettiTick((t) => t + 1);
                                playRomanticCelebrationChime();
                              }}
                            />
                          </div>
                        )}

                        {/* Scratch helper / instant reveal button */}
                        {isForMe && !isRedeemed && !isScratched && (
                          <div className="scratch-helper-bar">
                            <span>👆 സ്ക്രീനിൽ സ്ക്രാച്ച് ചെയ്യുക</span>
                            <button
                              type="button"
                              className="scratch-quick-reveal-btn"
                              onClick={() => {
                                setScratchedIds((prev) => new Set(prev).add(coupon.id));
                                setConfettiTick((t) => t + 1);
                                playRomanticCelebrationChime();
                              }}
                            >
                              വേഗത്തിൽ തുറക്കുക (Quick Reveal ✨)
                            </button>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {isForMe && !isRedeemed && (
                            <button
                              type="button"
                              className="romantic-primary-btn"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => handleRedeemCoupon(coupon)}
                            >
                              <PartyPopper size={16} />
                              ഇപ്പോൾ റിഡീം ചെയ്യുക (Redeem Now 💖)
                            </button>
                          )}
                          {isRedeemed && (
                            <button
                              type="button"
                              className="romantic-chip"
                              style={{ flex: 1, justifyContent: 'center', borderColor: '#34d399', color: '#34d399' }}
                              onClick={() => {
                                if (onSendToChat) {
                                  onSendToChat(formatCouponRedeemedShare(coupon, user.name));
                                }
                              }}
                            >
                              <Share2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                              ചാറ്റിൽ ഷെയർ ചെയ്യുക (Share to Chat)
                            </button>
                          )}
                          <ButtonIcon
                            label="Delete"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                          >
                            <Trash2 size={16} />
                          </ButtonIcon>
                        </div>

                        <div className="love-coupon-footer">
                          <span>
                            {isForMe
                              ? `Gifted by: ${coupon.sender_name || peer?.name || 'Partner'}`
                              : `Given to: ${coupon.recipient_name || peer?.name || 'Partner'}`}
                          </span>
                          <span>
                            {isRedeemed
                              ? 'Claimed ✨'
                              : new Date(coupon.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 2: SHARED COUPLE BUCKET LIST
              ============================================================== */}
          {activeTab === 'bucketlist' && (
            <div>
              {/* Progress Bar Card */}
              <div className="bucket-progress-card">
                <div className="bucket-progress-stats">
                  <div className="bucket-progress-headline">
                    🌟 നമ്മുടെ സ്വപ്ന നേട്ടങ്ങൾ: {completedCount} / {totalBucket} പൂർത്തിയായി ({bucketPct}%)
                  </div>
                  <div className="bucket-progress-bar-bg">
                    <div
                      className="bucket-progress-bar-fill"
                      style={{ width: `${bucketPct}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="romantic-primary-btn"
                  onClick={() => setShowAddBucket(!showAddBucket)}
                >
                  <Plus size={16} />
                  {showAddBucket ? 'ക്ലോസ് ചെയ്യുക' : '+ പുതിയ സ്വപ്നം ചേർക്കാം (Add Dream)'}
                </button>
              </div>

              {/* Add Bucket Item Form */}
              {showAddBucket && (
                <div className="custom-form-modal">
                  <h4 style={{ margin: '0 0 14px', color: '#fff', fontSize: '1rem' }}>
                    ✨ നമ്മുടെ സ്വപ്ന ലിസ്റ്റിലേക്ക് ഒരു പുതിയ ആഗ്രഹം (Add to Bucket List):
                  </h4>
                  <form onSubmit={handleAddBucketItem}>
                    <div className="custom-form-row">
                      <label className="custom-form-label">സ്വപ്നം / ആഗ്രഹം (Dream Title):</label>
                      <input
                        type="text"
                        className="custom-form-input"
                        value={bucketTitle}
                        onChange={(e) => setBucketTitle(e.target.value)}
                        placeholder="ഉദാ: 'മുന്നാറിൽ ഒരുമിച്ച് മഞ്ഞുകാലത്ത് യാത്ര പോവുക 🏔️'"
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="custom-form-row">
                        <label className="custom-form-label">കാറ്റഗറി (Category):</label>
                        <select
                          className="custom-form-input"
                          value={bucketCat}
                          onChange={(e) => setBucketCat(e.target.value)}
                        >
                          <option value="travel">Travel & Trips (യാത്രകൾ) ✈️</option>
                          <option value="romantic">Romantic (റൊമാന്റിക്) 💖</option>
                          <option value="cozy">Cozy Home (വീട്ടിൽ) 🏡</option>
                          <option value="adventure">Adventure (അഡ്വഞ്ചർ) 🚀</option>
                          <option value="pets">Pets & Cute Life (ക്യൂട്ട്) 🐾</option>
                        </select>
                      </div>
                      <div className="custom-form-row">
                        <label className="custom-form-label">ലക്ഷ്യം / തീയതി (Target Time):</label>
                        <input
                          type="text"
                          className="custom-form-input"
                          value={bucketTargetDate}
                          onChange={(e) => setBucketTargetDate(e.target.value)}
                          placeholder="ഉദാ: 'ഈ മഞ്ഞുകാലത്ത്', 'Next Year'"
                        />
                      </div>
                    </div>
                    <div className="custom-form-row">
                      <label className="custom-form-label">നമ്മുടെ കുറിപ്പ് (Sweet Notes):</label>
                      <textarea
                        rows={2}
                        className="custom-form-textarea"
                        value={bucketNotes}
                        onChange={(e) => setBucketNotes(e.target.value)}
                        placeholder="നമ്മൾ ഇത് എങ്ങനെ ചെയ്യണം, എന്തൊക്കെ പ്ലാൻ ചെയ്യണം..."
                      />
                    </div>
                    <button type="submit" className="romantic-primary-btn">
                      <Sparkles size={16} />
                      ലിസ്റ്റിലേക്ക് ചേർക്കുക (Add to Shared Dreams)
                    </button>
                  </form>
                </div>
              )}

              {/* Category Filter Chips */}
              <div className="romantic-subnav">
                <div className="romantic-chips-row">
                  {BUCKET_LIST_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`romantic-chip ${bucketCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setBucketCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`romantic-chip ${bucketCategory === 'completed' ? 'active' : ''}`}
                    onClick={() => setBucketCategory('completed')}
                  >
                    പൂർത്തിയായവ 📸 ({completedCount})
                  </button>
                </div>
              </div>

              {/* Bucket Items Grid */}
              <div className="bucket-items-grid">
                {displayedBucket.map((item) => (
                  <div
                    key={item.id}
                    className={`bucket-item-card ${item.is_completed ? 'completed' : ''}`}
                  >
                    <div className="bucket-item-top">
                      <h4 className="bucket-item-title">{item.title}</h4>
                      <span
                        className="love-coupon-badge"
                        style={{
                          background: item.is_completed
                            ? 'rgba(52,211,153,0.2)'
                            : 'rgba(236,72,153,0.2)',
                          color: item.is_completed ? '#34d399' : '#f472b6',
                        }}
                      >
                        {item.is_completed ? '✅ Completed' : `⏳ ${item.target_date || 'Dream'}`}
                      </span>
                    </div>

                    {item.notes && <p className="bucket-item-notes">{item.notes}</p>}

                    {/* Polaroid Photo if Completed */}
                    {item.completion_photo && (
                      <div className="bucket-polaroid-photo">
                        <img src={item.completion_photo} alt={item.title} />
                      </div>
                    )}

                    {item.completion_note && (
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontStyle: 'italic',
                          color: '#fbcfe8',
                          marginBottom: '10px',
                        }}
                      >
                        💌 "{item.completion_note}"
                      </div>
                    )}

                    {/* Complete Dialog */}
                    {completingItemId === item.id && (
                      <div className="bucket-complete-dialog">
                        <h5 style={{ margin: '0 0 10px', color: '#fff', fontSize: '0.9rem' }}>
                          📸 ഓർമ്മ ചേർത്ത് പൂർത്തിയാക്കൂ (Complete Milestone):
                        </h5>
                        <div className="custom-form-row">
                          <label className="custom-form-label">പൂർത്തിയാക്കിയ തീയതി (Date):</label>
                          <input
                            type="date"
                            className="custom-form-input"
                            value={completionDate}
                            onChange={(e) => setCompletionDate(e.target.value)}
                          />
                        </div>
                        <div className="custom-form-row">
                          <label className="custom-form-label">മധുരമുള്ള ഓർമ്മക്കുറിപ്പ് (Memory Note):</label>
                          <input
                            type="text"
                            className="custom-form-input"
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            placeholder="നമ്മുടെ ആ മനോഹരമായ നിമിഷം..."
                          />
                        </div>
                        <div className="custom-form-row">
                          <label className="custom-form-label">ഫോട്ടോ ചേർക്കുക (Attach Photo):</label>
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handlePhotoSelect}
                          />
                          <button
                            type="button"
                            className="romantic-chip"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Camera size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {completionPhoto ? 'ഫോട്ടോ തിരഞ്ഞെടുത്തു! 🖼️' : 'ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക 📸'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            type="button"
                            className="romantic-primary-btn"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => handleCompleteBucketItem(item.id)}
                          >
                            <CheckCircle2 size={16} />
                            സേവ് ചെയ്യുക (Save Milestone ✨)
                          </button>
                          <button
                            type="button"
                            className="romantic-chip"
                            onClick={() => setCompletingItemId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                      {!item.is_completed && completingItemId !== item.id && (
                        <button
                          type="button"
                          className="romantic-primary-btn"
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          onClick={() => setCompletingItemId(item.id)}
                        >
                          <Camera size={14} />
                          പൂർത്തിയാക്കി! (Mark Completed 📸)
                        </button>
                      )}

                      {item.is_completed && (
                        <button
                          type="button"
                          className="romantic-chip"
                          style={{ borderColor: '#34d399', color: '#34d399' }}
                          onClick={() => {
                            if (onSendToChat) {
                              onSendToChat(formatBucketCompletedShare(item, user.name, item.completed_at?.slice(0, 10)));
                            }
                          }}
                        >
                          <Share2 size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          ചാറ്റിൽ ഷെയർ ചെയ്യാം
                        </button>
                      )}

                      <div style={{ marginLeft: 'auto' }}>
                        <ButtonIcon
                          label="Delete"
                          onClick={() => handleDeleteBucketItem(item.id)}
                        >
                          <Trash2 size={15} />
                        </ButtonIcon>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 3: DATE NIGHT IDEA WHEEL
              ============================================================== */}
          {activeTab === 'datewheel' && (
            <div className="date-wheel-container">
              <h3 className="date-wheel-headline">
                "ഇന്ന് എന്താ ചെയ്യുക?" ഡേറ്റ് നൈറ്റ് ഐഡിയ വീൽ 🎲🕯️
              </h3>
              <p className="date-wheel-subtitle">
                ആലോചിച്ച് സമയം കളയേണ്ട! വീൽ ഒന്ന് കറക്കൂ, ഇന്നത്തെ സ്പെഷ്യൽ ഡേറ്റ് പ്രണയപൂർവ്വം പ്ലാൻ ചെയ്യാം ✨
              </p>

              {/* Filter Pills */}
              <div className="romantic-chips-row" style={{ marginBottom: '16px' }}>
                {DATE_NIGHT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`romantic-chip ${wheelCategory === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      if (!isSpinning) setWheelCategory(cat.id);
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Wheel View */}
              <div className="date-wheel-wrapper">
                <div className="date-wheel-pointer" />
                <canvas
                  ref={wheelCanvasRef}
                  className="date-wheel-canvas"
                  width={320}
                  height={320}
                />
                <div className="date-wheel-center-knob">
                  <Heart size={24} fill="#fff" />
                </div>
              </div>

              {/* Spin Trigger Button */}
              <button
                type="button"
                className="spin-wheel-btn"
                disabled={isSpinning}
                onClick={spinWheel}
              >
                <Dices size={20} />
                {isSpinning ? 'സ്പിൻ ചെയ്യുന്നു... 💫' : 'വീൽ കറക്കൂ! (SPIN THE WHEEL 🎲)'}
              </button>

              {/* Winning Selection Card */}
              {winnerIdea && (
                <div className="date-winner-modal">
                  <div className="date-winner-emoji">{winnerIdea.emoji}</div>
                  <h3 className="date-winner-title">
                    {winnerIdea.titleMl}
                  </h3>
                  <div style={{ fontSize: '0.88rem', color: '#f472b6', marginBottom: '8px' }}>
                    {winnerIdea.titleEn}
                  </div>
                  <p className="date-winner-desc">
                    {winnerIdea.descMl}
                  </p>

                  <div className="date-winner-tags">
                    <span className="date-winner-tag">⏱️ {winnerIdea.duration}</span>
                    <span className="date-winner-tag">💰 {winnerIdea.budget}</span>
                  </div>

                  <div className="date-winner-actions">
                    <button
                      type="button"
                      className="romantic-primary-btn"
                      onClick={handleShareWinnerIdea}
                    >
                      <Send size={16} />
                      ചാറ്റിലേക്ക് അയക്കൂ (Plan This Date 💬)
                    </button>
                    <button
                      type="button"
                      className="romantic-chip"
                      onClick={handleAddWinnerToBucket}
                    >
                      <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      സ്വപ്ന ലിസ്റ്റിലേക്ക് മാറ്റാം (Add to Bucket List ✈️)
                    </button>
                    <button
                      type="button"
                      className="romantic-chip"
                      onClick={spinWheel}
                    >
                      <RotateCcw size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      വീണ്ടും കറക്കുക (Spin Again)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
