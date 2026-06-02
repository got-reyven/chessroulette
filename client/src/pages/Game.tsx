import { useMemo } from "react";
import { ChessBoard } from "../components/ChessBoard";
import { MoveHistory } from "../components/MoveHistory";
import { PlayerPanel } from "../components/PlayerPanel";
import type { GameOverPayload, PlayerColor } from "../types";
import "../styles/game.css";

interface GameProps {
  fen: string;
  color: PlayerColor;
  turn: PlayerColor;
  history: string[];
  opponentName: string;
  myName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaError: string | null;
  gameOver: GameOverPayload | null;
  opponentLeft: string | null;
  requeued: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
}

export function Game({
  fen,
  color,
  turn,
  history,
  opponentName,
  myName,
  localStream,
  remoteStream,
  mediaError,
  gameOver,
  opponentLeft,
  requeued,
  onMove,
}: GameProps) {
  const myLabel = useMemo(
    () => `${myName} (${color === "w" ? "White" : "Black"}) — You`,
    [myName, color]
  );
  const oppLabel = useMemo(
    () => `${opponentName} (${color === "w" ? "Black" : "White"})`,
    [opponentName, color]
  );

  const isMyTurn = turn === color && !gameOver && !opponentLeft;
  const turnLabel = isMyTurn
    ? "Your turn"
    : gameOver || opponentLeft
      ? "Game ended"
      : "Opponent's turn";

  const overlayMessage = opponentLeft
    ? opponentLeft
    : gameOver
      ? gameOver.winner
        ? `${gameOver.winner} wins (${gameOver.reason})`
        : `Draw (${gameOver.reason})`
      : null;

  return (
    <div className="game-shell">
      <header className="game-header">
        <span className="game-header-brand">Chess Roulette</span>
        <div className="game-header-meta">
          <span
            className={`game-turn-pill ${isMyTurn ? "game-turn-pill--yours" : "game-turn-pill--waiting"}`}
          >
            {turnLabel}
          </span>
        </div>
      </header>

      <div className="game">
        {requeued && (
          <div className="game-banner">Finding next opponent…</div>
        )}
        {overlayMessage && !requeued && (
          <div className="game-overlay">
            <div className="game-overlay-card">
              <h2>{opponentLeft ? "Opponent left" : "Game over"}</h2>
              <p>{overlayMessage}</p>
              <p className="game-overlay-sub">Re-entering matchmaking…</p>
            </div>
          </div>
        )}

        <div className="game-board-col">
          <ChessBoard
            fen={fen}
            color={color}
            turn={turn}
            onMove={onMove}
            disabled={!!gameOver || !!opponentLeft}
          />
        </div>

        <MoveHistory history={history} />

        <div className="game-players-col">
          <PlayerPanel
            label={oppLabel}
            stream={remoteStream}
            placeholder={
              mediaError ? `Video: ${mediaError}` : "Waiting for opponent video"
            }
          />
          <PlayerPanel
            label={myLabel}
            stream={localStream}
            isLocal
            placeholder={
              mediaError ? "Camera unavailable" : "Your camera feed"
            }
          />
        </div>
      </div>
    </div>
  );
}
