# Chess Roulette

Real-time 1v1 chess with random matchmaking and live webcam video (WebRTC).

## Features

- Random pairing from a global queue
- Server-authoritative chess (`chess.js`)
- Live move sync via Socket.io
- Peer-to-peer video with Socket.io signaling
- Auto re-enter matchmaking after each game

## Local development

**Requirements:** Node.js 18+

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000 (Socket.io proxied through Vite)

Open two browser tabs, enter nicknames, click **Find match**, allow camera/mic when prompted.

## Production build

```bash
npm run build
npm start
```

Serves the Vite build from the same process on `PORT` (default 3000).

## Deploy (Railway or Render)

1. Create a new **Web Service** from this repo.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Set `NODE_ENV=production`
5. Platform sets `PORT` automatically.

**Health check:** `GET /health`

HTTPS is required for webcam access outside localhost.

### Render `render.yaml` (optional)

This repo includes a `render.yaml` blueprint for one-click deploy on Render.

### Railway

Use the same build/start commands. Enable public networking.

### Vercel (frontend only)

This repo includes `vercel.json` for the Vite client. Vercel hosts static files only; the Socket.io server must run elsewhere (Render/Railway).

1. Deploy the backend with the build/start commands above.
2. Deploy this repo on Vercel (uses `vercel.json` automatically).
3. Set **`VITE_SOCKET_URL`** to your backend URL (e.g. `https://your-app.onrender.com`).
4. On Render, set **`CLIENT_ORIGIN`** to your Vercel URL (e.g. `https://chessroulette-tau.vercel.app`) so Socket.io allows cross-origin connections. If unset, the server allows any origin in production.

## Testing the full flow

1. Deploy and open the public URL on two devices (or two browsers).
2. Both players click **Find match**.
3. Verify board moves sync and both video panels show streams.
4. Finish a game (or resign by closing a tab) and confirm both return to the queue after ~4 seconds.

## Architecture

- `server/` — Express, Socket.io, matchmaking, chess rooms
- `client/` — Vite + React + react-chessboard + WebRTC hook

## Notes

- Matchmaking and rooms are in-memory (single server instance).
- STUN only (`stun.l.google.com`); strict NAT may need a TURN server.
- Pawn promotions default to queen.
