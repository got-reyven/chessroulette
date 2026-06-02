import { Chess } from "chess.js";

export interface GameRoom {
  roomId: string;
  chess: Chess;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
}

const rooms = new Map<string, GameRoom>();

export function createRoom(
  roomId: string,
  whiteId: string,
  blackId: string,
  whiteName: string,
  blackName: string
): GameRoom {
  const room: GameRoom = {
    roomId,
    chess: new Chess(),
    whiteId,
    blackId,
    whiteName,
    blackName,
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function getGameStatePayload(room: GameRoom) {
  const chess = room.chess;
  const history = chess.history();
  const lastMove = history.length > 0 ? history[history.length - 1] : null;

  return {
    fen: chess.fen(),
    lastMove,
    history,
    turn: chess.turn(),
    isGameOver: chess.isGameOver(),
    result: chess.isGameOver() ? getResult(chess) : null,
  };
}

function getResult(chess: Chess): string {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "0-1" : "1-0";
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return "1/2-1/2";
  }
  return "*";
}
