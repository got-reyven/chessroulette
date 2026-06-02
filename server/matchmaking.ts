import type { Server, Socket } from "socket.io";
import { createRoom, deleteRoom, getRoom } from "./rooms";

export type PlayerStatus = "idle" | "queued" | "in_game";

interface QueuedPlayer {
  socket: Socket;
  nickname: string;
}

const waiting: QueuedPlayer[] = [];

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pickTwoRandom<T>(arr: T[]): [T, T] | null {
  if (arr.length < 2) return null;
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * arr.length);
  while (j === i) {
    j = Math.floor(Math.random() * arr.length);
  }
  return [arr[i], arr[j]];
}

export function removeFromQueue(socketId: string): void {
  const idx = waiting.findIndex((p) => p.socket.id === socketId);
  if (idx !== -1) waiting.splice(idx, 1);
}

export function addToQueue(socket: Socket, nickname: string): void {
  removeFromQueue(socket.id);
  socket.data.status = "queued";
  socket.data.nickname = nickname;
  waiting.push({ socket, nickname });
}

export function tryPair(io: Server): void {
  while (waiting.length >= 2) {
    const pair = pickTwoRandom(waiting);
    if (!pair) break;

    const [a, b] = pair;
    const idxA = waiting.indexOf(a);
    const idxB = waiting.indexOf(b);
    if (idxA === -1 || idxB === -1) continue;

    waiting.splice(Math.max(idxA, idxB), 1);
    waiting.splice(Math.min(idxA, idxB), 1);

    const roomId = randomId();
    const whiteFirst = Math.random() < 0.5;
    const white = whiteFirst ? a : b;
    const black = whiteFirst ? b : a;

    createRoom(
      roomId,
      white.socket.id,
      black.socket.id,
      white.nickname,
      black.nickname
    );

    white.socket.data.status = "in_game";
    white.socket.data.roomId = roomId;
    white.socket.data.color = "w";
    black.socket.data.status = "in_game";
    black.socket.data.roomId = roomId;
    black.socket.data.color = "b";

    white.socket.join(roomId);
    black.socket.join(roomId);

    const fen = getRoom(roomId)!.chess.fen();

    white.socket.emit("matched", {
      roomId,
      color: "w",
      opponentName: black.nickname,
      fen,
      isInitiator: true,
    });

    black.socket.emit("matched", {
      roomId,
      color: "b",
      opponentName: white.nickname,
      fen,
      isInitiator: false,
    });
  }
}

export function requeuePlayer(io: Server, socket: Socket): void {
  if (!socket.connected) return;
  const nickname =
    (socket.data.nickname as string) || `Guest-${socket.id.slice(0, 6)}`;
  socket.data.roomId = undefined;
  socket.data.color = undefined;
  addToQueue(socket, nickname);
  socket.emit("requeued");
  tryPair(io);
}

export function endRoom(io: Server, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  deleteRoom(roomId);
  io.in(roomId).socketsLeave(roomId);
}
