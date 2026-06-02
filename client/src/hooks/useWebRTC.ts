import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

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
          const [remote] = ev.streams;
          if (remote) setRemoteStream(remote);
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            s.emit("webrtc_ice", { candidate: ev.candidate.toJSON() });
          }
        };

        const onOffer = async (data: { sdp: RTCSessionDescriptionInit }) => {
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          s.emit("webrtc_answer", { sdp: answer });
        };

        const onAnswer = async (data: { sdp: RTCSessionDescriptionInit }) => {
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
        };

        const onIce = async (data: { candidate: RTCIceCandidateInit }) => {
          if (!pcRef.current || !data.candidate) return;
          try {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch {
            /* ignore stale candidates */
          }
        };

        s.on("webrtc_offer", onOffer);
        s.on("webrtc_answer", onAnswer);
        s.on("webrtc_ice", onIce);

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit("webrtc_offer", { sdp: offer });
        }

        return () => {
          s.off("webrtc_offer", onOffer);
          s.off("webrtc_answer", onAnswer);
          s.off("webrtc_ice", onIce);
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
