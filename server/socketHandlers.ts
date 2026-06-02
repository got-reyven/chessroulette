import type { Server, Socket } from "socket.io";
import {
  addToQueue,
  endRoom,
  removeFromQueue,
  requeuePlayer,
  tryPair,
} from "./matchmaking";
import { getGameStatePayload, getRoom } from "./rooms";

const REQUEUE_DELAY_MS = 4000;

function scheduleRequeue(io: Server, sockets: Socket[]): void {
  setTimeout(() => {
    for (const s of sockets) {
      if (s.connected) requeuePlayer(io, s);
    }
  }, REQUEUE_DELAY_MS);
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.data.status = "idle";
    socket.data.nickname = `Guest-${socket.id.slice(0, 6)}`;

    socket.on("join_queue", ({ nickname }: { nickname?: string }) => {
      if (socket.data.status === "in_game") return;
      const name =
        nickname?.trim() || `Guest-${socket.id.slice(0, 6)}`;
      addToQueue(socket, name);
      socket.emit("queue_joined");
      tryPair(io);
    });

    socket.on("leave_queue", () => {
      removeFromQueue(socket.id);
      socket.data.status = "idle";
      socket.emit("queue_left");
    });

    socket.on(
      "move",
      ({
        from,
        to,
        promotion,
      }: {
        from: string;
        to: string;
        promotion?: string;
      }) => {
        const roomId = socket.data.roomId as string | undefined;
        if (!roomId || socket.data.status !== "in_game") return;

        const room = getRoom(roomId);
        if (!room) return;

        const color = socket.data.color as "w" | "b";
        if (room.chess.turn() !== color) {
          socket.emit("move_error", { message: "Not your turn" });
          return;
        }

        try {
          const move = room.chess.move({ from, to, promotion });
          if (!move) {
            socket.emit("move_error", { message: "Illegal move" });
            return;
          }

          const state = getGameStatePayload(room);
          io.to(roomId).emit("game_state", state);

          if (room.chess.isGameOver()) {
            const winner = getWinnerLabel(room, state.result);
            io.to(roomId).emit("game_over", {
              result: state.result,
              reason: getEndReason(room),
              winner,
            });

            const sockets = Array.from(io.sockets.sockets.values()).filter(
              (s) => s.data.roomId === roomId
            );
            endRoom(io, roomId);
            for (const s of sockets) {
              s.data.status = "idle";
              s.data.roomId = undefined;
              s.data.color = undefined;
            }
            scheduleRequeue(io, sockets);
          }
        } catch {
          socket.emit("move_error", { message: "Illegal move" });
        }
      }
    );

    socket.on("webrtc_ready", () => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      socket.to(roomId).emit("peer_webrtc_ready");
    });

    socket.on("webrtc_offer", (payload: { sdp: unknown }) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      socket.to(roomId).emit("webrtc_offer", { ...payload, from: socket.id });
    });

    socket.on("webrtc_answer", (payload: { sdp: unknown }) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      socket.to(roomId).emit("webrtc_answer", { ...payload, from: socket.id });
    });

    socket.on("webrtc_ice", (payload: { candidate: unknown }) => {
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId) return;
      socket.to(roomId).emit("webrtc_ice", { ...payload, from: socket.id });
    });

    socket.on("disconnect", () => {
      removeFromQueue(socket.id);
      const roomId = socket.data.roomId as string | undefined;
      if (!roomId || socket.data.status !== "in_game") return;

      const disconnectedId = socket.id;
      const survivor = Array.from(io.sockets.sockets.values()).find(
        (s) => s.data.roomId === roomId && s.id !== disconnectedId
      );
      const survivorId = survivor?.id;

      setTimeout(() => {
        if (io.sockets.sockets.has(disconnectedId)) return;

        const survivorNow = survivorId
          ? io.sockets.sockets.get(survivorId)
          : undefined;
        if (!survivorNow || survivorNow.data.roomId !== roomId) return;
        if (!getRoom(roomId)) return;

        io.to(roomId).emit("opponent_left", {
          message: "Opponent disconnected",
        });
        endRoom(io, roomId);
        if (survivorNow.connected) {
          survivorNow.data.status = "idle";
          survivorNow.data.roomId = undefined;
          survivorNow.data.color = undefined;
          requeuePlayer(io, survivorNow);
        }
      }, 3000);
    });
  });
}

function getWinnerLabel(
  room: ReturnType<typeof getRoom>,
  result: string | null
): string | null {
  if (!room || !result) return null;
  if (result === "1-0") return room.whiteName;
  if (result === "0-1") return room.blackName;
  if (result === "1/2-1/2") return null;
  return null;
}

function getEndReason(room: NonNullable<ReturnType<typeof getRoom>>): string {
  if (room.chess.isCheckmate()) return "checkmate";
  if (room.chess.isStalemate()) return "stalemate";
  if (room.chess.isDraw()) return "draw";
  return "game_over";
}
