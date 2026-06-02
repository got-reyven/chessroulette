export type PlayerColor = "w" | "b";

export interface MatchedPayload {
  roomId: string;
  color: PlayerColor;
  opponentName: string;
  fen: string;
  isInitiator: boolean;
}

export interface GameStatePayload {
  fen: string;
  lastMove: string | null;
  history: string[];
  turn: PlayerColor;
  isGameOver: boolean;
  result: string | null;
}

export interface GameOverPayload {
  result: string | null;
  reason: string;
  winner: string | null;
}
