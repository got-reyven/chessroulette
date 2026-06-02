import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers";

const PORT = parseInt(process.env.PORT || "3000", 10);
const isDev = process.env.NODE_ENV !== "production";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: isDev
    ? { origin: "http://localhost:5173", methods: ["GET", "POST"] }
    : undefined,
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
