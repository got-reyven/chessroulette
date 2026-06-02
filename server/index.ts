import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers";

const PORT = parseInt(process.env.PORT || "3000", 10);
const isDev = process.env.NODE_ENV !== "production";

function socketCorsOptions() {
  const fromEnv = process.env.CLIENT_ORIGIN?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (fromEnv?.length) {
    return { origin: fromEnv, methods: ["GET", "POST"] };
  }
  if (isDev) {
    return { origin: "http://localhost:5173", methods: ["GET", "POST"] };
  }
  // Vercel (or other) frontend on a different origin than this server
  return { origin: true, methods: ["GET", "POST"] };
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: socketCorsOptions(),
});

registerSocketHandlers(io);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

if (!isDev) {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Chess Roulette server on port ${PORT}`);
});
