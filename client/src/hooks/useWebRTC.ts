import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type Signal =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

export function useWebRTC(
  socket: Socket | null,
  roomId: string | null,
  isInitiator: boolean,
  enabled: boolean
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMediaError(null);
  }, []);

  useEffect(() => {
    if (!socket || !roomId || !enabled) {
      cleanup();
      return;
    }

    const s = socket;
    let cancelled = false;
    let peerReady = false;
    let localReady = false;
    let offerSent = false;
    const pendingSignals: Signal[] = [];
    const iceQueue: RTCIceCandidateInit[] = [];

    const drainIceQueue = async (pc: RTCPeerConnection) => {
      while (iceQueue.length > 0) {
        const candidate = iceQueue.shift();
        if (!candidate) continue;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore stale candidates */
        }
      }
    };

    const sendOffer = async (pc: RTCPeerConnection) => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit("webrtc_offer", { sdp: offer });
    };

    const processSignal = async (signal: Signal) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await drainIceQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("webrtc_answer", { sdp: answer });
        return;
      }

      if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await drainIceQueue(pc);
        return;
      }

      if (!pc.remoteDescription) {
        iceQueue.push(signal.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch {
        /* ignore stale candidates */
      }
    };

    const flushSignals = () => {
      if (!localReady || !pcRef.current) return;
      while (pendingSignals.length > 0) {
        const signal = pendingSignals.shift();
        if (signal) void processSignal(signal);
      }
    };

    const queueSignal = (signal: Signal) => {
      if (localReady && pcRef.current) {
        void processSignal(signal);
      } else {
        pendingSignals.push(signal);
      }
    };

    const tryStartCall = () => {
      if (
        !isInitiator ||
        !localReady ||
        !peerReady ||
        !pcRef.current ||
        offerSent
      ) {
        return;
      }
      offerSent = true;
      void sendOffer(pcRef.current);
    };

    const onOffer = (data: { sdp: RTCSessionDescriptionInit }) => {
      queueSignal({ type: "offer", sdp: data.sdp });
    };

    const onAnswer = (data: { sdp: RTCSessionDescriptionInit }) => {
      queueSignal({ type: "answer", sdp: data.sdp });
    };

    const onIce = (data: { candidate: RTCIceCandidateInit }) => {
      if (!data.candidate) return;
      queueSignal({ type: "ice", candidate: data.candidate });
    };

    const onPeerReady = () => {
      peerReady = true;
      tryStartCall();
    };

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (ev) => {
          const stream =
            ev.streams[0] ?? new MediaStream([ev.track]);
          setRemoteStream(stream);
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            s.emit("webrtc_ice", { candidate: ev.candidate.toJSON() });
          }
        };

        s.on("webrtc_offer", onOffer);
        s.on("webrtc_answer", onAnswer);
        s.on("webrtc_ice", onIce);
        s.on("peer_webrtc_ready", onPeerReady);

        localReady = true;
        flushSignals();
        s.emit("webrtc_ready");
        tryStartCall();

        return () => {
          s.off("webrtc_offer", onOffer);
          s.off("webrtc_answer", onAnswer);
          s.off("webrtc_ice", onIce);
          s.off("peer_webrtc_ready", onPeerReady);
        };
      } catch (err) {
        if (!cancelled) {
          setMediaError(
            err instanceof Error ? err.message : "Camera/mic access denied"
          );
        }
      }
    }

    const teardownListeners = start();

    return () => {
      cancelled = true;
      teardownListeners.then((off) => off?.());
      cleanup();
    };
  }, [socket, roomId, isInitiator, enabled, cleanup]);

  return { localStream, remoteStream, mediaError };
}
