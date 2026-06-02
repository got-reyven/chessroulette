import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { useWebRTC } from "./hooks/useWebRTC";
import { Lobby } from "./pages/Lobby";
import { Game } from "./pages/Game";
import type {
  GameOverPayload,
  GameStatePayload,
  MatchedPayload,
  PlayerColor,
} from "./types";

type View = "lobby" | "game";

export default function App() {
  const { socket, connected } = useSocket();
  const [view, setView] = useState<View>("lobby");
  const [searching, setSearching] = useState(false);
  const [myName, setMyName] = useState("");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [color, setColor] = useState<PlayerColor>("w");
  const [opponentName, setOpponentName] = useState("");
  const [isInitiator, setIsInitiator] = useState(false);
  const [fen, setFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );
  const [turn, setTurn] = useState<PlayerColor>("w");
  const [history, setHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [opponentLeft, setOpponentLeft] = useState<string | null>(null);
  const [requeued, setRequeued] = useState(false);

  const activeSocket = connected ? socket.current : null;
  const gameActiveRef = useRef(false);
  gameActiveRef.current =
    view === "game" && !!roomId && !gameOver && !opponentLeft;

  const { localStream, remoteStream, mediaError } = useWebRTC(
    activeSocket,
    roomId,
    isInitiator,
    view === "game" && !!roomId
  );

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onMatched = (data: MatchedPayload) => {
      setRoomId(data.roomId);
      setColor(data.color);
      setOpponentName(data.opponentName);
      setIsInitiator(data.isInitiator);
      setFen(data.fen);
      setTurn("w");
      setHistory([]);
      setGameOver(null);
      setOpponentLeft(null);
      setRequeued(false);
      setSearching(false);
      setView("game");
    };

    const onGameState = (state: GameStatePayload) => {
      setFen(state.fen);
      setTurn(state.turn);
      setHistory(state.history);
    };

    const onGameOver = (payload: GameOverPayload) => {
      setGameOver(payload);
    };

    const onOpponentLeft = (payload: { message: string }) => {
      setOpponentLeft(payload.message);
      setRoomId(null);
    };

    const onRequeued = () => {
      if (gameActiveRef.current) return;
      setRequeued(true);
      setGameOver(null);
      setOpponentLeft(null);
      setRoomId(null);
      setView("lobby");
      setSearching(true);
    };

    const onQueueJoined = () => setSearching(true);
    const onQueueLeft = () => setSearching(false);

    const onMoveError = (payload: { message: string }) => {
      console.warn("Move error:", payload.message);
    };

    s.on("matched", onMatched);
    s.on("game_state", onGameState);
    s.on("game_over", onGameOver);
    s.on("opponent_left", onOpponentLeft);
    s.on("requeued", onRequeued);
    s.on("queue_joined", onQueueJoined);
    s.on("queue_left", onQueueLeft);
    s.on("move_error", onMoveError);

    return () => {
      s.off("matched", onMatched);
      s.off("game_state", onGameState);
      s.off("game_over", onGameOver);
      s.off("opponent_left", onOpponentLeft);
      s.off("requeued", onRequeued);
      s.off("queue_joined", onQueueJoined);
      s.off("queue_left", onQueueLeft);
      s.off("move_error", onMoveError);
    };
  }, [socket]);

  const handleFindMatch = useCallback(
    (nickname: string) => {
      setMyName(nickname);
      setSearching(true);
      socket.current?.emit("join_queue", { nickname });
    },
    [socket]
  );

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      socket.current?.emit("move", { from, to, promotion });
    },
    [socket]
  );

  if (view === "game") {
    return (
      <Game
        fen={fen}
        color={color}
        turn={turn}
        history={history}
        opponentName={opponentName}
        myName={myName}
        localStream={localStream}
        remoteStream={remoteStream}
        mediaError={mediaError}
        gameOver={gameOver}
        opponentLeft={opponentLeft}
        requeued={requeued}
        onMove={handleMove}
      />
    );
  }

  return (
    <Lobby
      connected={connected}
      searching={searching}
      onFindMatch={handleFindMatch}
    />
  );
}
