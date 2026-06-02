import { useEffect, useRef } from "react";
import "../styles/player-panel.css";

interface PlayerPanelProps {
  label: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  placeholder?: string;
}

export function PlayerPanel({
  label,
  stream,
  isLocal = false,
  placeholder = "Waiting for video…",
}: PlayerPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      void el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className={`player-panel ${isLocal ? "player-panel--local" : ""}`}>
      <div className="panel-header">{label}</div>
      <div className="player-panel-video-wrap">
        {stream ? (
          <>
            <span className="player-panel-live">Live</span>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="player-panel-video"
            />
          </>
        ) : (
          <div className="player-panel-placeholder">
            <span className="player-panel-placeholder-icon" aria-hidden="true">
              {isLocal ? "📷" : "👤"}
            </span>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
