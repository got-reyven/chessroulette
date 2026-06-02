import { FormEvent, useState } from "react";
import "../styles/lobby.css";

interface LobbyProps {
  connected: boolean;
  searching: boolean;
  onFindMatch: (nickname: string) => void;
}

export function Lobby({ connected, searching, onFindMatch }: LobbyProps) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onFindMatch(nickname.trim() || `Guest-${Math.random().toString(36).slice(2, 8)}`);
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1 className="lobby-title">Chess Roulette</h1>
        <p className="lobby-subtitle">
          Get matched randomly. Play chess face-to-face on video.
        </p>
        <form className="lobby-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            disabled={searching}
          />
          <button type="submit" disabled={!connected || searching}>
            {searching ? "Searching…" : "Find match"}
          </button>
        </form>
        {searching && (
          <p className="lobby-status">Looking for an opponent…</p>
        )}
        <p className={`lobby-connected ${connected ? "" : "offline"}`}>
          {connected ? "Connected to server" : "Connecting…"}
        </p>
      </div>
    </div>
  );
}
