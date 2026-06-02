import { Chessboard } from "react-chessboard";
import type { PlayerColor } from "../types";

interface ChessBoardProps {
  fen: string;
  color: PlayerColor;
  turn: PlayerColor;
  onMove: (from: string, to: string, promotion?: string) => void;
  disabled?: boolean;
}

export function ChessBoard({
  fen,
  color,
  turn,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  const canMove = !disabled && turn === color;

  return (
    <div className="board-wrap">
      <Chessboard
        position={fen}
        boardOrientation={color === "w" ? "white" : "black"}
        arePiecesDraggable={canMove}
        onPieceDrop={(source, target) => {
          if (!canMove) return false;
          const promoRank = color === "w" ? "8" : "1";
          const needsPromo = target[1] === promoRank;
          onMove(source, target, needsPromo ? "q" : undefined);
          return false;
        }}
      />
    </div>
  );
}
