import { Chessboard } from "react-chessboard";
import type { PlayerColor } from "../types";

interface ChessBoardProps {
  fen: string;
  color: PlayerColor;
  turn: PlayerColor;
  onMove: (from: string, to: string, promotion?: string) => void;
  disabled?: boolean;
}

const BOARD_LIGHT = "#e8dcc4";
const BOARD_DARK = "#4a6741";

export function ChessBoard({
  fen,
  color,
  turn,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  const canMove = !disabled && turn === color;

  return (
    <div className={`board-wrap ${canMove ? "board-wrap--active" : ""}`}>
      <div className="board-wrap-inner">
        <Chessboard
          position={fen}
          boardOrientation={color === "w" ? "white" : "black"}
          arePiecesDraggable={canMove}
          customBoardStyle={{
            borderRadius: "4px",
            boxShadow: "inset 0 2px 12px rgba(0, 0, 0, 0.15)",
          }}
          customLightSquareStyle={{ backgroundColor: BOARD_LIGHT }}
          customDarkSquareStyle={{ backgroundColor: BOARD_DARK }}
          onPieceDrop={(source, target) => {
            if (!canMove) return false;
            const promoRank = color === "w" ? "8" : "1";
            const needsPromo = target[1] === promoRank;
            onMove(source, target, needsPromo ? "q" : undefined);
            return false;
          }}
        />
      </div>
    </div>
  );
}
