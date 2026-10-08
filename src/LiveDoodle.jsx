import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Heart,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Send,
  StickyNote,
  Gamepad2,
  Eraser,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import { ButtonIcon } from './components.jsx';

// Play harmonic crystal chimes using Web Audio API
function playSoundEffect(type, soundEnabled = true) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    if (type === 'heart') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'stamp') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } else if (type === 'spark') {
      [880, 1174.66, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    }
  } catch {
    /* AudioContext might be blocked until user gesture */
  }
}

const ROMANTIC_PALETTE = [
  { name: 'Passion Red', value: '#E11D48' },
  { name: 'Rose Pink', value: '#F43F5E' },
  { name: 'Cotton Candy', value: '#EC4899' },
  { name: 'Sunset Peach', value: '#F97316' },
  { name: 'Warm Gold', value: '#F59E0B' },
  { name: 'Fresh Mint', value: '#10B981' },
  { name: 'Sky Cyan', value: '#06B6D4' },
  { name: 'Starlight Indigo', value: '#6366F1' },
  { name: 'Dream Lavender', value: '#A855F7' },
  { name: 'Cocoa Warm', value: '#78350F' },
  { name: 'Pure White', value: '#FFFFFF' },
  { name: 'Midnight Dark', value: '#0F172A' },
];

const BRUSH_SIZES = [
  { label: 'Fine', value: 3 },
  { label: 'Medium', value: 7 },
  { label: 'Bold', value: 14 },
  { label: 'Chunky', value: 24 },
];

const STAMPS = [
  '❤️', '💖', '💋', '💌', '🌹', '💍', '🧸', '✨', '🌸', '🕊️', '💫', '🫂',
];

const NOTE_COLORS = [
  { name: 'Rose', bg: '#ffe4e6', border: '#f43f5e', text: '#881337' },
  { name: 'Sunny', bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
  { name: 'Mint', bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
  { name: 'Lilac', bg: '#ede9fe', border: '#a855f7', text: '#581c87' },
  { name: 'Cream', bg: '#fffbeb', border: '#d97706', text: '#451a03' },
];

const DOODLE_PROMPTS = [
  { ml: 'നമ്മുടെ സ്വപ്ന ഭവനം വരയ്ക്കൂ 🏡', en: 'Draw our dream home together' },
  { ml: 'ആദ്യം സംസാരിച്ചപ്പോൾ തോന്നിയത് വരയ്ക്കൂ 💕', en: 'Draw how you felt when we first talked' },
  { ml: 'നമ്മുടെ പ്രിയപ്പെട്ട ലഘുഭക്ഷണം 🍕', en: 'Draw our favorite midnight snack' },
  { ml: 'നമുക്കൊരു അരുമ മൃഗത്തെ വരയ്ക്കൂ 🐱🐶', en: 'Draw a cute pet for our sanctuary' },
  { ml: 'ഇന്ന് നിങ്ങളെ ചിരിപ്പിച്ച കാര്യം 😊', en: 'Draw what made you smile today' },
  { ml: 'നമ്മുടെ അടുത്ത യാത്ര എങ്ങോട്ടാണ്? ✈️🏖️', en: 'Draw our next holiday adventure' },
  { ml: 'നിങ്ങൾ എനിക്ക് നൽകാൻ ആഗ്രഹിക്കുന്ന സമ്മാനം 🎁', en: 'Draw a surprise gift for me' },
  { ml: 'നമ്മുടെ 50 വർഷത്തിന് ശേഷമുള്ള ചിത്രം 👵🧓', en: 'Draw the two of us 50 years from now' },
];

const CONSTELLATIONS = [
  {
    name: 'Heart of Stars (നക്ഷത്ര ഹൃദയം)',
    points: [
      { id: 1, x: 0.5, y: 0.35 },
      { id: 2, x: 0.35, y: 0.2 },
      { id: 3, x: 0.2, y: 0.3 },
      { id: 4, x: 0.25, y: 0.5 },
      { id: 5, x: 0.5, y: 0.75 },
      { id: 6, x: 0.75, y: 0.5 },
      { id: 7, x: 0.8, y: 0.3 },
      { id: 8, x: 0.65, y: 0.2 },
    ],
  },
  {
    name: 'Infinity Bond (അനന്തമായ സ്നേഹം ♾️)',
    points: [
      { id: 1, x: 0.3, y: 0.4 },
      { id: 2, x: 0.2, y: 0.5 },
      { id: 3, x: 0.3, y: 0.6 },
      { id: 4, x: 0.5, y: 0.5 },
      { id: 5, x: 0.7, y: 0.4 },
      { id: 6, x: 0.8, y: 0.5 },
      { id: 7, x: 0.7, y: 0.6 },
    ],
  },
];

// Render a single stroke object on a canvas context
function renderSingleStroke(ctx, stroke, width, height, bgTheme) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;

  if (stroke.type === 'stamp') {
    const [pt] = stroke.points;
    ctx.font = `${(stroke.size || 24) * 2}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stroke.stamp || '❤️', pt.x * width, pt.y * height);
    return;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.strokeStyle =
      bgTheme === 'starry'
        ? '#12152b'
        : bgTheme === 'rose'
          ? '#fff1f2'
          : bgTheme === 'parchment'
            ? '#fffbeb'
            : '#18181b';
    ctx.lineWidth = (stroke.size || 10) * 2;
  } else if (stroke.tool === 'neon') {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size || 6;
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = (stroke.size || 6) * 2.2;
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size || 6;
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.arc(pts[0].x * width, pts[0].y * height, (stroke.size || 6) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
  } else {
    ctx.moveTo(pts[0].x * width, pts[0].y * height);
    for (let i = 1; i < pts.length; i++) {
      const xc = ((pts[i - 1].x + pts[i].x) / 2) * width;
      const yc = ((pts[i - 1].y + pts[i].y) / 2) * height;
      ctx.quadraticCurveTo(pts[i - 1].x * width, pts[i - 1].y * height, xc, yc);
    }
    ctx.lineTo(pts[pts.length - 1].x * width, pts[pts.length - 1].y * height);
    ctx.stroke();
  }

  if (stroke.tool === 'heart_trail') {
    ctx.font = '12px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < pts.length; i += 6) {
      ctx.fillText('💖', pts[i].x * width, pts[i].y * height - 8);
    }
  }

  ctx.restore();
}

export function LiveDoodleModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const strokesRef = useRef([]);
  const undoStackRef = useRef([]);

  // Local state
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#E11D48');
  const [brushSize, setBrushSize] = useState(7);
  const [selectedStamp, setSelectedStamp] = useState('❤️');
  const [bgTheme, setBgTheme] = useState('starry');
  const [notes, setNotes] = useState([]);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [noteColorIndex, setNoteColorIndex] = useState(0);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(true);

  // Mini game state
  const [gameMode, setGameMode] = useState('none');
  const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
  const [tttTurn, setTttTurn] = useState('X');
  const [tttWinner, setTttWinner] = useState(null);
  const [constellationIndex, setConstellationIndex] = useState(0);
  const [connectedDots, setConnectedDots] = useState([]);

  // Peer presence & collaboration
  const [peerActive, setPeerActive] = useState(false);
  const [peerCursor, setPeerCursor] = useState(null);
  const [peerDrawing, setPeerDrawing] = useState(false);
  const [heartParticles, setHeartParticles] = useState([]);
  const [touchSpark, setTouchSpark] = useState(null);
  const [savingToChat, setSavingToChat] = useState(false);

  const peerDrawingTimer = useRef(null);
  const cursorThrottle = useRef(0);
  const localCursorPos = useRef(null);
  const stateSnapshotRef = useRef({});

  stateSnapshotRef.current = {
    notes,
    bgTheme,
    gameMode,
    tttBoard,
    tttTurn,
    soundEnabled,
  };

  // Redraw complete canvas from strokes list
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (bgTheme === 'starry') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0c1022');
      grad.addColorStop(1, '#1b1d36');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const starSeed = [
        [0.1, 0.15, 1.5], [0.25, 0.08, 1], [0.4, 0.22, 2], [0.55, 0.12, 1.2],
        [0.75, 0.18, 1.8], [0.88, 0.09, 1.4], [0.15, 0.45, 1.2], [0.35, 0.55, 2.2],
        [0.65, 0.4, 1.5], [0.85, 0.6, 1.8], [0.2, 0.8, 1.3], [0.45, 0.88, 2],
        [0.7, 0.82, 1.2], [0.9, 0.85, 1.5],
      ];
      starSeed.forEach(([rx, ry, r]) => {
        ctx.beginPath();
        ctx.arc(rx * width, ry * height, r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (bgTheme === 'rose') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#fff1f2');
      grad.addColorStop(1, '#ffe4e6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.03)';
      ctx.font = `${Math.min(width, height) * 0.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤️', width / 2, height / 2);
    } else if (bgTheme === 'parchment') {
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.12)';
      ctx.lineWidth = 1;
      const lineStep = 32;
      for (let y = lineStep; y < height; y += lineStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.lineTo(48, height);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, width, height);
    }

    strokesRef.current.forEach((stroke) => {
      renderSingleStroke(ctx, stroke, width, height, bgTheme);
    });
  }, [bgTheme]);

  // Resize canvas to match display container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width);
      const targetHeight = Math.floor(rect.height);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        redrawCanvas();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Spawn visual floating hearts
  const spawnHeartBurst = useCallback((normX, normY, emoji = '❤️') => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = normX * rect.width;
    const py = normY * rect.height;

    const newHearts = Array.from({ length: 8 }, (_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 120,
      vy: -60 - Math.random() * 120,
      emoji,
      scale: 0.8 + Math.random() * 0.8,
      rotation: (Math.random() - 0.5) * 60,
    }));

    setHeartParticles((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setHeartParticles((prev) => prev.filter((p) => !newHearts.some((nh) => nh.id === p.id)));
    }, 1200);
  }, []);

  // Trigger romantic touch spark when both fingers touch together
  const triggerTouchSpark = useCallback((normX, normY) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setTouchSpark({
      x: normX * rect.width,
      y: normY * rect.height,
      id: Date.now(),
    });
    playSoundEffect('spark', stateSnapshotRef.current.soundEnabled);
    setTimeout(() => setTouchSpark(null), 1800);
  }, []);

  // Handle incoming socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'joined',
      userName: user.name,
    });

    const handleSync = (payload) => {
      if (payload.conversation_id !== conversationId) return;

      if (payload.action === 'joined') {
        setPeerActive(true);
        socket.emit('doodle:sync', {
          conversation_id: conversationId,
          action: 'snapshot',
          strokes: strokesRef.current,
          notes: stateSnapshotRef.current.notes,
          bgTheme: stateSnapshotRef.current.bgTheme,
          gameMode: stateSnapshotRef.current.gameMode,
          tttBoard: stateSnapshotRef.current.tttBoard,
          tttTurn: stateSnapshotRef.current.tttTurn,
        });
      } else if (payload.action === 'snapshot') {
        setPeerActive(true);
        if (Array.isArray(payload.strokes)) {
          strokesRef.current = payload.strokes;
          redrawCanvas();
        }
        if (Array.isArray(payload.notes)) setNotes(payload.notes);
        if (payload.bgTheme) setBgTheme(payload.bgTheme);
        if (payload.gameMode) setGameMode(payload.gameMode);
        if (payload.tttBoard) setTttBoard(payload.tttBoard);
        if (payload.tttTurn) setTttTurn(payload.tttTurn);
      } else if (payload.action === 'stroke_chunk') {
        setPeerActive(true);
        setPeerDrawing(true);
        clearTimeout(peerDrawingTimer.current);
        peerDrawingTimer.current = setTimeout(() => setPeerDrawing(false), 900);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          renderSingleStroke(
            ctx,
            payload.stroke,
            canvas.width,
            canvas.height,
            stateSnapshotRef.current.bgTheme,
          );
        }
      } else if (payload.action === 'stroke_end') {
        setPeerActive(true);
        setPeerDrawing(false);
        if (payload.stroke) {
          strokesRef.current.push(payload.stroke);
          redrawCanvas();
        }
      } else if (payload.action === 'cursor') {
        setPeerActive(true);
        setPeerCursor({ x: payload.x, y: payload.y, name: payload.name });

        if (localCursorPos.current) {
          const dx = Math.abs(localCursorPos.current.x - payload.x);
          const dy = Math.abs(localCursorPos.current.y - payload.y);
          if (dx < 0.05 && dy < 0.05) {
            triggerTouchSpark(
              (localCursorPos.current.x + payload.x) / 2,
              (localCursorPos.current.y + payload.y) / 2,
            );
          }
        }
      } else if (payload.action === 'heart_burst') {
        spawnHeartBurst(payload.x, payload.y, payload.emoji || '❤️');
        playSoundEffect('heart', stateSnapshotRef.current.soundEnabled);
      } else if (payload.action === 'clear') {
        strokesRef.current = [];
        redrawCanvas();
      } else if (payload.action === 'undo') {
        strokesRef.current.pop();
        redrawCanvas();
      } else if (payload.action === 'theme') {
        setBgTheme(payload.theme);
      } else if (payload.action === 'notes_update') {
        setNotes(payload.notes || []);
      } else if (payload.action === 'ttt_move') {
        setTttBoard(payload.board);
        setTttTurn(payload.turn);
        setTttWinner(payload.winner);
        if (payload.winner) playSoundEffect('win', stateSnapshotRef.current.soundEnabled);
      } else if (payload.action === 'ttt_reset') {
        setTttBoard(Array(9).fill(null));
        setTttTurn('X');
        setTttWinner(null);
      } else if (payload.action === 'dots_connect') {
        setConnectedDots(payload.connected);
        playSoundEffect('stamp', stateSnapshotRef.current.soundEnabled);
      }
    };

    socket.on('doodle:sync', handleSync);

    return () => {
      socket.off('doodle:sync', handleSync);
      clearTimeout(peerDrawingTimer.current);
    };
  }, [conversationId, user.name, socket, redrawCanvas, spawnHeartBurst, triggerTouchSpark]);

  // Convert client coordinate to normalized (0..1) relative to canvas
  const getNormCoords = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  // Pointer down (start drawing / stamping / heart bursting)
  const handlePointerDown = (event) => {
    const { x, y } = getNormCoords(event);
    localCursorPos.current = { x, y };

    if (tool === 'heart_burst') {
      spawnHeartBurst(x, y, selectedStamp);
      playSoundEffect('heart', soundEnabled);
      socket?.emit('doodle:sync', {
        conversation_id: conversationId,
        action: 'heart_burst',
        x,
        y,
        emoji: selectedStamp,
      });
      return;
    }

    if (tool === 'stamp') {
      const newStroke = {
        id: crypto.randomUUID(),
        type: 'stamp',
        stamp: selectedStamp,
        size: brushSize,
        points: [{ x, y }],
      };
      strokesRef.current.push(newStroke);
      undoStackRef.current = [];
      redrawCanvas();
      playSoundEffect('stamp', soundEnabled);
      socket?.emit('doodle:sync', {
        conversation_id: conversationId,
        action: 'stroke_end',
        stroke: newStroke,
      });
      return;
    }

    const stroke = {
      id: crypto.randomUUID(),
      tool,
      color: tool === 'rainbow' ? `hsl(${Math.floor(Math.random() * 360)}, 85%, 65%)` : color,
      size: brushSize,
      points: [{ x, y }],
    };
    activeStrokeRef.current = stroke;
  };

  // Pointer move (stream points)
  const handlePointerMove = (event) => {
    const { x, y } = getNormCoords(event);
    localCursorPos.current = { x, y };

    const now = performance.now();
    if (now - cursorThrottle.current > 40) {
      cursorThrottle.current = now;
      socket?.emit('doodle:sync', {
        conversation_id: conversationId,
        action: 'cursor',
        x,
        y,
        name: user.name,
      });
    }

    if (!activeStrokeRef.current) return;
    const stroke = activeStrokeRef.current;
    stroke.points.push({ x, y });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      renderSingleStroke(ctx, stroke, canvas.width, canvas.height, bgTheme);
    }

    if (stroke.points.length % 3 === 0) {
      socket?.emit('doodle:sync', {
        conversation_id: conversationId,
        action: 'stroke_chunk',
        stroke,
      });
    }
  };

  // Pointer up (finalize stroke)
  const handlePointerUp = () => {
    if (!activeStrokeRef.current) return;
    const finishedStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    strokesRef.current.push(finishedStroke);
    undoStackRef.current = [];
    redrawCanvas();

    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'stroke_end',
      stroke: finishedStroke,
    });
  };

  // Undo / Redo
  const handleUndo = () => {
    if (!strokesRef.current.length) return;
    const popped = strokesRef.current.pop();
    undoStackRef.current.push(popped);
    redrawCanvas();
    socket?.emit('doodle:sync', { conversation_id: conversationId, action: 'undo' });
  };

  const handleRedo = () => {
    if (!undoStackRef.current.length) return;
    const restored = undoStackRef.current.pop();
    strokesRef.current.push(restored);
    redrawCanvas();
    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'stroke_end',
      stroke: restored,
    });
  };

  // Clear Canvas
  const handleClear = () => {
    if (!strokesRef.current.length) return;
    if (window.confirm('Clear the entire doodle canvas? (കാൻവാസ് മുഴുവൻ മായ്ക്കണോ?)')) {
      strokesRef.current = [];
      undoStackRef.current = [];
      redrawCanvas();
      socket?.emit('doodle:sync', { conversation_id: conversationId, action: 'clear' });
    }
  };

  // Background theme change
  const handleThemeChange = (theme) => {
    setBgTheme(theme);
    socket?.emit('doodle:sync', { conversation_id: conversationId, action: 'theme', theme });
  };

  // Add / Edit Love Note
  const handleAddNote = () => {
    if (!activeNoteText.trim()) return;
    const newNote = {
      id: crypto.randomUUID(),
      text: activeNoteText.trim(),
      author: user.name,
      color: NOTE_COLORS[noteColorIndex],
      x: 0.15 + Math.random() * 0.4,
      y: 0.2 + Math.random() * 0.4,
      rotation: (Math.random() - 0.5) * 8,
    };
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setActiveNoteText('');
    setIsAddingNote(false);
    playSoundEffect('stamp', soundEnabled);
    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'notes_update',
      notes: updatedNotes,
    });
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'notes_update',
      notes: updatedNotes,
    });
  };

  // Tic Tac Toe Game Logic
  const handleTttClick = (index) => {
    if (tttBoard[index] || tttWinner) return;
    const newBoard = [...tttBoard];
    newBoard[index] = tttTurn;
    const nextTurn = tttTurn === 'X' ? 'O' : 'X';

    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    let winner = null;
    for (const [a, b, c] of winningLines) {
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = newBoard[a];
        break;
      }
    }
    if (!winner && newBoard.every((cell) => cell !== null)) {
      winner = 'draw';
    }

    setTttBoard(newBoard);
    setTttTurn(nextTurn);
    setTttWinner(winner);
    if (winner) playSoundEffect('win', soundEnabled);
    else playSoundEffect('stamp', soundEnabled);

    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'ttt_move',
      board: newBoard,
      turn: nextTurn,
      winner,
    });
  };

  const handleTttReset = () => {
    setTttBoard(Array(9).fill(null));
    setTttTurn('X');
    setTttWinner(null);
    socket?.emit('doodle:sync', {
      conversation_id: conversationId,
      action: 'ttt_reset',
    });
  };

  // Connect-the-dots game logic
  const handleDotClick = (pointId) => {
    const expected = connectedDots.length + 1;
    if (pointId === expected) {
      const next = [...connectedDots, pointId];
      setConnectedDots(next);
      playSoundEffect('stamp', soundEnabled);
      if (next.length === CONSTELLATIONS[constellationIndex].points.length) {
        playSoundEffect('win', soundEnabled);
      }
      socket?.emit('doodle:sync', {
        conversation_id: conversationId,
        action: 'dots_connect',
        connected: next,
      });
    }
  };

  // Export composite artwork to PNG and save to chat
  const handleSaveToChat = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSavingToChat(true);

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');

      ctx.drawImage(canvas, 0, 0);

      notes.forEach((note) => {
        ctx.save();
        const nx = note.x * exportCanvas.width;
        const ny = note.y * exportCanvas.height;
        ctx.translate(nx, ny);
        ctx.rotate((note.rotation * Math.PI) / 180);

        ctx.fillStyle = note.color.bg;
        ctx.strokeStyle = note.color.border;
        ctx.lineWidth = 1.5;
        const cardW = 160;
        const cardH = 90;
        ctx.beginPath();
        ctx.roundRect(0, 0, cardW, cardH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = note.color.border;
        ctx.beginPath();
        ctx.arc(cardW / 2, 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = note.color.text;
        ctx.font = 'bold 12px "DM Sans", sans-serif';
        ctx.fillText(note.author, 10, 24);

        ctx.font = '11px "DM Sans", sans-serif';
        const words = note.text.split(' ');
        let line = '';
        let lineY = 40;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > cardW - 20 && n > 0) {
            ctx.fillText(line, 10, lineY);
            line = words[n] + ' ';
            lineY += 15;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 10, lineY);
        ctx.restore();
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px "DM Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `Kipenzi Sanctuary 🤍 ${user.name} & ${peer?.name || 'My Person'}`,
        exportCanvas.width - 15,
        exportCanvas.height - 15,
      );

      exportCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Could not render image blob');
        await onSendToChat(blob, '🎨 Our Live Doodle Masterpiece! (തത്സമയം ഒന്നിച്ച് വരച്ച ചിത്രം) 🤍');
        setSavingToChat(false);
      }, 'image/png');
    } catch (err) {
      setSavingToChat(false);
      onError?.(err.message);
    }
  };

  // Download directly to device
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `kipenzi-doodle-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="live-doodle-backdrop" role="dialog" aria-modal="true">
      <div className="live-doodle-container">
        {/* Top Header */}
        <header className="doodle-header">
          <div className="doodle-header-left">
            <div className="doodle-badge">
              <Palette size={18} />
              <span>LIVE DOODLE TOGETHER</span>
            </div>
            <div className="doodle-presence">
              <span className={`presence-dot ${peerActive ? 'online' : 'waiting'}`} />
              <span className="presence-text">
                {peerDrawing
                  ? `✨ ${peer?.name || 'Partner'} is drawing...`
                  : peerActive
                    ? `🟢 Connected with ${peer?.name || 'Partner'}`
                    : `Waiting for ${peer?.name || 'your person'} to join...`}
              </span>
            </div>
          </div>

          {/* Quick Prompts Banner */}
          {showPrompt && (
            <div className="doodle-prompt-pill">
              <Sparkles size={14} className="prompt-sparkle" />
              <div className="prompt-content">
                <strong>{DOODLE_PROMPTS[activePromptIndex].ml}</strong>
                <small>{DOODLE_PROMPTS[activePromptIndex].en}</small>
              </div>
              <button
                type="button"
                className="prompt-next-btn"
                title="Next prompt (അടുത്ത വിഷയം)"
                onClick={() => setActivePromptIndex((i) => (i + 1) % DOODLE_PROMPTS.length)}
              >
                🎲 Next
              </button>
              <button
                type="button"
                className="prompt-close-btn"
                title="Hide prompt banner"
                onClick={() => setShowPrompt(false)}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Top Actions */}
          <div className="doodle-header-actions">
            <button
              type="button"
              className="doodle-sound-btn"
              title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              className="doodle-send-chat-btn"
              disabled={savingToChat}
              onClick={handleSaveToChat}
              title="Save & Send to Chat (ചാറ്റിലേക്ക് അയക്കാം)"
            >
              <Send size={15} />
              <span>{savingToChat ? 'Sending...' : 'Send to Chat'}</span>
            </button>

            <ButtonIcon label="Download PNG" onClick={handleDownload}>
              <Download size={18} />
            </ButtonIcon>

            <ButtonIcon label="Close Canvas" onClick={onClose}>
              <X size={20} />
            </ButtonIcon>
          </div>
        </header>

        {/* Toolbar Bar */}
        <div className="doodle-toolbar">
          {/* Brush Tools */}
          <div className="toolbar-group">
            <button
              type="button"
              className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
              title="Smooth Pen (സ്മൂത്ത് പെൻ)"
            >
              <span className="tool-icon">🖌️</span>
              <span className="tool-label">Pen</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'neon' ? 'active' : ''}`}
              onClick={() => setTool('neon')}
              title="Neon Glow (നിയോൺ ഗ്ലോ)"
            >
              <span className="tool-icon">✨</span>
              <span className="tool-label">Glow</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'heart_trail' ? 'active' : ''}`}
              onClick={() => setTool('heart_trail')}
              title="Heart Trail Brush (വിരൽത്തുമ്പിൽ ഹാർട്ടുകൾ)"
            >
              <span className="tool-icon">💖</span>
              <span className="tool-label">Heart Trail</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'rainbow' ? 'active' : ''}`}
              onClick={() => setTool('rainbow')}
              title="Rainbow Pastel (റെയിൻബോ)"
            >
              <span className="tool-icon">🌈</span>
              <span className="tool-label">Rainbow</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
              title="Eraser (ഇറേസർ)"
            >
              <Eraser size={16} />
              <span className="tool-label">Eraser</span>
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === 'heart_burst' ? 'active' : ''}`}
              onClick={() => setTool('heart_burst')}
              title="Tap Heart Burst (തൊടുമ്പോൾ ഹാർട്ടുകൾ)"
            >
              <Heart size={16} className="burst-heart-icon" />
              <span className="tool-label">Heart Tap</span>
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Romantic Color Swatches */}
          <div className="toolbar-colors">
            {ROMANTIC_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-dot ${color === c.value && tool !== 'rainbow' && tool !== 'eraser' ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => {
                  setColor(c.value);
                  if (tool === 'eraser') setTool('pen');
                }}
                title={c.name}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') setTool('pen');
              }}
              className="color-picker-input"
              title="Custom Color"
            />
          </div>

          <div className="toolbar-divider" />

          {/* Brush Sizes */}
          <div className="toolbar-sizes">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`size-btn ${brushSize === s.value ? 'active' : ''}`}
                onClick={() => setBrushSize(s.value)}
                title={`${s.label} (${s.value}px)`}
              >
                <span
                  className="size-indicator"
                  style={{
                    width: `${Math.min(s.value * 1.5, 18)}px`,
                    height: `${Math.min(s.value * 1.5, 18)}px`,
                  }}
                />
              </button>
            ))}
          </div>

          <div className="toolbar-divider" />

          {/* Stamps Bar */}
          <div className="toolbar-stamps">
            <span className="stamps-title">Stamps:</span>
            {STAMPS.map((s) => (
              <button
                key={s}
                type="button"
                className={`stamp-btn ${selectedStamp === s && tool === 'stamp' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStamp(s);
                  setTool('stamp');
                }}
                title={`Stamp ${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="toolbar-divider" />

          {/* Features: Love Note & Mini-Games */}
          <div className="toolbar-group">
            <button
              type="button"
              className={`feature-btn ${isAddingNote ? 'active' : ''}`}
              onClick={() => setIsAddingNote(!isAddingNote)}
              title="Add Love Note (ലവ് നോട്ട് എഴുതാം)"
            >
              <StickyNote size={15} />
              <span>Love Note</span>
            </button>

            <button
              type="button"
              className={`feature-btn ${gameMode !== 'none' ? 'active' : ''}`}
              onClick={() =>
                setGameMode(
                  gameMode === 'none'
                    ? 'tictactoe'
                    : gameMode === 'tictactoe'
                      ? 'dots'
                      : 'none',
                )
              }
              title="Mini Game (ചെറിയ കളികൾ)"
            >
              <Gamepad2 size={15} />
              <span>
                {gameMode === 'none'
                  ? 'Games'
                  : gameMode === 'tictactoe'
                    ? 'Tic-Tac-Toe'
                    : 'Star Dots'}
              </span>
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Canvas Themes */}
          <div className="toolbar-themes">
            <span className="theme-title">Canvas:</span>
            <button
              type="button"
              className={`theme-dot ${bgTheme === 'starry' ? 'active' : ''}`}
              onClick={() => handleThemeChange('starry')}
              title="Starry Midnight (ഗാലക്സി)"
            >
              🌌
            </button>
            <button
              type="button"
              className={`theme-dot ${bgTheme === 'rose' ? 'active' : ''}`}
              onClick={() => handleThemeChange('rose')}
              title="Romantic Rose (റോസ്)"
            >
              🌸
            </button>
            <button
              type="button"
              className={`theme-dot ${bgTheme === 'parchment' ? 'active' : ''}`}
              onClick={() => handleThemeChange('parchment')}
              title="Lined Love Letter (ലവ് ലെറ്റർ)"
            >
              📜
            </button>
            <button
              type="button"
              className={`theme-dot ${bgTheme === 'chalk' ? 'active' : ''}`}
              onClick={() => handleThemeChange('chalk')}
              title="Chalkboard Dark (ബ്ലാക്ക്ബോർഡ്)"
            >
              🖤
            </button>
          </div>

          {/* Undo, Redo, Clear */}
          <div className="toolbar-actions">
            <ButtonIcon label="Undo (പിന്നോട്ട്)" onClick={handleUndo}>
              <RotateCcw size={16} />
            </ButtonIcon>
            <ButtonIcon label="Redo (മുന്നോട്ട്)" onClick={handleRedo}>
              <RotateCw size={16} />
            </ButtonIcon>
            <ButtonIcon label="Clear Canvas (മായ്ക്കുക)" onClick={handleClear}>
              <Trash2 size={16} />
            </ButtonIcon>
          </div>
        </div>

        {/* Note Composer Floating Box */}
        {isAddingNote && (
          <div className="doodle-note-composer">
            <div className="note-composer-header">
              <span>💌 Write a Love Note (ലവ് നോട്ട്)</span>
              <button type="button" onClick={() => setIsAddingNote(false)}>
                <X size={14} />
              </button>
            </div>
            <textarea
              value={activeNoteText}
              onChange={(e) => setActiveNoteText(e.target.value)}
              placeholder="Write something sweet for your person... (മനോഹരമായ ഒരു വാക്ക് എഴുതൂ)"
              maxLength={150}
              autoFocus
            />
            <div className="note-composer-footer">
              <div className="note-color-picker">
                {NOTE_COLORS.map((nc, idx) => (
                  <button
                    key={nc.name}
                    type="button"
                    className={`note-color-dot ${noteColorIndex === idx ? 'active' : ''}`}
                    style={{ backgroundColor: nc.bg, borderColor: nc.border }}
                    onClick={() => setNoteColorIndex(idx)}
                  />
                ))}
              </div>
              <button type="button" className="note-post-btn" onClick={handleAddNote}>
                Stick on Canvas 📌
              </button>
            </div>
          </div>
        )}

        {/* Main Canvas Stage */}
        <div className="doodle-stage" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className={`doodle-canvas ${tool === 'eraser' ? 'eraser-cursor' : tool === 'heart_burst' ? 'heart-cursor' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* Sticky Love Notes rendered over the canvas */}
          {notes.map((n) => (
            <div
              key={n.id}
              className="canvas-sticky-note"
              style={{
                left: `${n.x * 100}%`,
                top: `${n.y * 100}%`,
                backgroundColor: n.color.bg,
                borderColor: n.color.border,
                color: n.color.text,
                transform: `rotate(${n.rotation}deg)`,
              }}
            >
              <div className="sticky-pin" style={{ backgroundColor: n.color.border }} />
              <button
                type="button"
                className="sticky-close-btn"
                onClick={() => handleDeleteNote(n.id)}
                title="Remove note"
              >
                <X size={11} />
              </button>
              <div className="sticky-author">{n.author} 🤍</div>
              <div className="sticky-text">{n.text}</div>
            </div>
          ))}

          {/* Partner's Live Cursor Indicator */}
          {peerCursor && (
            <div
              className="peer-live-cursor"
              style={{
                left: `${peerCursor.x * 100}%`,
                top: `${peerCursor.y * 100}%`,
              }}
            >
              <span className="peer-cursor-pointer">✏️</span>
              <span className="peer-cursor-tag">{peerCursor.name || peer?.name || 'Partner'} 💖</span>
            </div>
          )}

          {/* Floating Heart Burst Particles */}
          {heartParticles.map((p) => (
            <div
              key={p.id}
              className="animated-heart-particle"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                transform: `translate(${p.vx}px, ${p.vy}px) scale(${p.scale}) rotate(${p.rotation}deg)`,
              }}
            >
              {p.emoji}
            </div>
          ))}

          {/* Soulmate Touch Spark when fingers meet */}
          {touchSpark && (
            <div
              className="soulmate-touch-spark"
              style={{ left: `${touchSpark.x}px`, top: `${touchSpark.y}px` }}
            >
              <div className="spark-halo" />
              <div className="spark-text">💖 Soulmate Touch! ✨</div>
            </div>
          )}

          {/* Mini-Game: Tic-Tac-Toe Overlay */}
          {gameMode === 'tictactoe' && (
            <div className="doodle-game-overlay tictactoe-panel">
              <div className="game-panel-header">
                <div className="game-title">
                  <Gamepad2 size={16} />
                  <span>Tic-Tac-Toe of Love (❤️ vs ⭐)</span>
                </div>
                <button
                  type="button"
                  className="game-close-btn"
                  onClick={() => setGameMode('none')}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="game-turn-banner">
                {tttWinner ? (
                  <span className="winner-announcement">
                    {tttWinner === 'draw'
                      ? "It's a Tie! Perfect Match 🤍"
                      : `${tttWinner === 'X' ? '❤️ Hearts Win!' : '⭐ Stars Win!'} Love always triumphs! 🎉`}
                  </span>
                ) : (
                  <span>
                    Turn: {tttTurn === 'X' ? '❤️ Player 1' : '⭐ Player 2'}
                  </span>
                )}
              </div>

              <div className="ttt-grid">
                {tttBoard.map((cell, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`ttt-cell ${cell ? 'filled' : ''}`}
                    onClick={() => handleTttClick(idx)}
                    disabled={!!cell || !!tttWinner}
                  >
                    {cell === 'X' ? '❤️' : cell === 'O' ? '⭐' : ''}
                  </button>
                ))}
              </div>

              <div className="game-footer">
                <button type="button" className="game-restart-btn" onClick={handleTttReset}>
                  <RefreshCw size={13} />
                  <span>Restart Match (വീണ്ടും കളിക്കാം)</span>
                </button>
              </div>
            </div>
          )}

          {/* Mini-Game: Connect the Star Dots */}
          {gameMode === 'dots' && (
            <div className="doodle-dots-layer">
              <div className="dots-hint">
                <span>🌟 {CONSTELLATIONS[constellationIndex].name}</span>
                <small>Connect dots in numerical order: 1 → 2 → 3...</small>
                <button
                  type="button"
                  className="dots-next-btn"
                  onClick={() => {
                    setConstellationIndex((i) => (i + 1) % CONSTELLATIONS.length);
                    setConnectedDots([]);
                  }}
                >
                  Next Shape
                </button>
              </div>

              {CONSTELLATIONS[constellationIndex].points.map((pt) => {
                const isConnected = connectedDots.includes(pt.id);
                return (
                  <button
                    key={pt.id}
                    type="button"
                    className={`constellation-dot ${isConnected ? 'connected' : ''}`}
                    style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                    onClick={() => handleDotClick(pt.id)}
                  >
                    <span>{pt.id}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Status Footer */}
        <footer className="doodle-footer">
          <div className="doodle-footer-tip">
            <Sparkles size={14} />
            <span>
              Tip: വിരൽത്തുമ്പുകൾ സ്പർശിക്കുമ്പോൾ സ്പെഷ്യൽ ഹാർട്ട് സ്പാർക്ക് വിരിയും! (Touch near each other for Soulmate Touch ✨)
            </span>
          </div>
          <div className="doodle-footer-author">
            Built with all my heart for <strong>{user.name}</strong> & <strong>{peer?.name || 'My Person'}</strong> 🤍
          </div>
        </footer>
      </div>
    </div>
  );
}
