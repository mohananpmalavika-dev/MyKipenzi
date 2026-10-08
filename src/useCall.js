import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
export function useCall(socket, user, onError) {
  const [call, setCall] = useState(null),
    [local, setLocal] = useState(null),
    [remote, setRemote] = useState(null),
    [phase, setPhase] = useState(''),
    [muted, setMuted] = useState(false),
    [cameraOff, setCameraOff] = useState(false),
    [sharing, setSharing] = useState(false);
  const current = useRef(null),
    pc = useRef(null),
    stream = useRef(null),
    screen = useRef(null),
    videoSender = useRef(null),
    ice = useRef([]),
    starting = useRef(false),
    disconnectTimer = useRef(null),
    activeOffer = useRef(false),
    aborted = useRef(false);
  const clean = useCallback(() => {
    aborted.current = true;
    clearTimeout(disconnectTimer.current);
    pc.current?.close();
    pc.current = null;
    for (const s of [stream.current, screen.current]) s?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    screen.current = null;
    videoSender.current = null;
    ice.current = [];
    starting.current = false;
    activeOffer.current = false;
    current.current = null;
    setCall(null);
    setLocal(null);
    setRemote(null);
    setMuted(false);
    setCameraOff(false);
    setSharing(false);
    setPhase('');
  }, []);
  const end = useCallback(async () => {
    const c = current.current;
    clean();
    if (c)
      try {
        await api(`/calls/${c.id}`, { method: 'PATCH', body: { action: 'end' } });
      } catch (e) {
        onError(e.message);
      }
  }, [clean, onError]);
  const send = useCallback(
    (type, data) => {
      if (!socket || !current.current) return;
      socket
        .timeout(8000)
        .emit('call:signal', { call_id: current.current.id, type, data }, (error, result) => {
          if (error || result?.error) onError(result?.error || 'Call connection interrupted.');
        });
    },
    [socket, onError],
  );
  const prepare = useCallback(
    async (kind) => {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Calls require HTTPS and microphone permission.');
      aborted.current = false;
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          kind === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
      });
      if (aborted.current) {
        media.getTracks().forEach((t) => t.stop());
        throw new Error('Call was cancelled.');
      }
      stream.current = media;
      setLocal(new MediaStream(media.getTracks()));
      const { iceServers } = await api('/calls/ice');
      if (aborted.current) throw new Error('Call was cancelled.');
      const peer = new RTCPeerConnection({ iceServers });
      pc.current = peer;
      media.getAudioTracks().forEach((track) => peer.addTrack(track, media));
      videoSender.current = peer.addTransceiver(media.getVideoTracks()[0] || 'video', {
        direction: 'sendrecv',
        streams: [media],
      }).sender;
      const remoteStream = new MediaStream();
      setRemote(remoteStream);
      peer.ontrack = (event) => {
        if (!remoteStream.getTracks().some((t) => t.id === event.track.id))
          remoteStream.addTrack(event.track);
        setRemote(new MediaStream(remoteStream.getTracks()));
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) send('ice', event.candidate.toJSON());
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          setPhase('Connected');
          clearTimeout(disconnectTimer.current);
        } else if (peer.connectionState === 'failed') {
          onError('Call could not connect. Check the TURN server and network.');
          void end();
        } else if (peer.connectionState === 'disconnected') {
          setPhase('Reconnecting…');
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = setTimeout(() => void end(), 20000);
        }
      };
    },
    [send, end, onError],
  );
  const update = useCallback(
    async (next) => {
      if (current.current && current.current.id !== next.id) return;
      if (next.caller_id === user.id && !pc.current) return;
      if (['ended', 'declined', 'missed'].includes(next.state)) {
        if (current.current?.id === next.id) {
          if (next.state !== 'ended')
            onError(next.state === 'missed' ? 'Call was not answered.' : 'Call declined.');
          clean();
        }
        return;
      }
      if (next.state === 'active' && !pc.current) {
        clean();
        return;
      }
      current.current = next;
      setCall(next);
      if (next.state === 'ringing')
        setPhase(next.caller_id === user.id ? 'Calling…' : 'Incoming call');
      if (
        next.state === 'active' &&
        next.caller_id === user.id &&
        pc.current &&
        !activeOffer.current
      ) {
        activeOffer.current = true;
        setPhase('Connecting…');
        try {
          const offer = await pc.current.createOffer();
          await pc.current.setLocalDescription(offer);
          send('offer', pc.current.localDescription.toJSON());
        } catch (e) {
          onError(e.message);
          void end();
        }
      }
    },
    [clean, user.id, send, onError, end],
  );
  useEffect(() => {
    if (!socket) return;
    const signal = async ({ call_id, type, data }) => {
      if (current.current?.id !== call_id || !pc.current) return;
      try {
        if (type === 'ice') {
          if (pc.current.remoteDescription) await pc.current.addIceCandidate(data);
          else ice.current.push(data);
        } else {
          await pc.current.setRemoteDescription(data);
          for (const candidate of ice.current) await pc.current.addIceCandidate(candidate);
          ice.current = [];
          if (type === 'offer') {
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            send('answer', pc.current.localDescription.toJSON());
          }
        }
      } catch (e) {
        onError(`Call error: ${e.message}`);
        void end();
      }
    };
    const disconnected = () => {
      if (current.current) {
        onError('Connection lost. The call has ended.');
        void end();
      }
    };
    const recover = async () => {
      try {
        const c = await api('/calls/current');
        if (!c || (c.state === 'active' && !pc.current)) return;
        await update(c);
      } catch (e) {
        onError(e.message);
      }
    };
    socket.on('call:changed', update);
    socket.on('call:signal', signal);
    socket.on('disconnect', disconnected);
    socket.on('connect', recover);
    if (socket.connected) void recover();
    return () => {
      socket.off('call:changed', update);
      socket.off('call:signal', signal);
      socket.off('disconnect', disconnected);
      socket.off('connect', recover);
    };
  }, [socket, update, send, onError, end]);
  useEffect(
    () => () => {
      pc.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
      screen.current?.getTracks().forEach((t) => t.stop());
      clearTimeout(disconnectTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!socket) return;
    const timer = setInterval(() => {
      if (current.current?.state === 'active' && pc.current)
        socket.emit('call:heartbeat', { call_id: current.current.id });
    }, 15000);
    return () => clearInterval(timer);
  }, [socket]);
  const start = async (conversationId, kind) => {
    if (starting.current || current.current) return;
    starting.current = true;
    try {
      if (!socket?.connected) throw new Error('Reconnect before starting a call.');
      setPhase('Preparing…');
      await prepare(kind);
      const result = await api(`/conversations/${conversationId}/calls`, {
        method: 'POST',
        body: { kind },
      });
      await update(result);
    } catch (e) {
      onError(e.message);
      clean();
    } finally {
      starting.current = false;
    }
  };
  const accept = async () => {
    if (starting.current || !current.current) return;
    starting.current = true;
    try {
      setPhase('Preparing…');
      await prepare(current.current.kind);
      const result = await api(`/calls/${current.current.id}`, {
        method: 'PATCH',
        body: { action: 'accept' },
      });
      await update(result);
    } catch (e) {
      onError(e.message);
      await end();
    } finally {
      starting.current = false;
    }
  };
  const decline = async () => {
    const c = current.current;
    clean();
    if (c)
      try {
        await api(`/calls/${c.id}`, { method: 'PATCH', body: { action: 'decline' } });
      } catch (e) {
        onError(e.message);
      }
  };
  const toggleMute = () => {
    stream.current?.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted(!muted);
  };
  const toggleCamera = () => {
    stream.current?.getVideoTracks().forEach((t) => {
      t.enabled = cameraOff;
    });
    setCameraOff(!cameraOff);
  };
  const stopShare = async () => {
    try {
      if (pc.current && videoSender.current)
        await videoSender.current.replaceTrack(stream.current?.getVideoTracks()[0] || null);
    } catch (e) {
      onError(e.message);
    }
    screen.current?.getTracks().forEach((t) => t.stop());
    screen.current = null;
    setSharing(false);
    if (stream.current) setLocal(new MediaStream(stream.current.getTracks()));
  };
  const share = async () => {
    if (sharing) {
      await stopShare();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error('Screen sharing is unavailable in this browser.');
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (!pc.current) {
        display.getTracks().forEach((t) => t.stop());
        return;
      }
      screen.current = display;
      await videoSender.current.replaceTrack(display.getVideoTracks()[0]);
      display.getVideoTracks()[0].onended = () => void stopShare();
      setLocal(display);
      setSharing(true);
    } catch (e) {
      if (e.name !== 'NotAllowedError') onError(e.message);
    }
  };
  return {
    call,
    local,
    remote,
    phase,
    muted,
    cameraOff,
    sharing,
    start,
    accept,
    decline,
    end,
    toggleMute,
    toggleCamera,
    share,
  };
}
