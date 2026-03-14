# Peerly — Encrypted P2P Communication

Free, encrypted peer-to-peer video and audio calls. Create a room, share the link, connect instantly. No sign-ups, no downloads, no servers touching your data.

## Features

- **Video & Audio Calls** — full HD video or audio-only, your choice
- **End-to-End Encrypted** — DTLS + SRTP encryption on every stream, negotiated directly between peers
- **P2P Chat & File Sharing** — send messages and transfer files through encrypted RTCDataChannel, no server involved
- **Noise Suppression** — Web Audio DSP pipeline with high/low-pass filters, noise gate, and dynamic compression
- **Live Captions** — real-time speech-to-text via browser Speech Recognition API, broadcast to all peers
- **Screen Sharing** — share your screen alongside your camera feed with one click
- **Connection Stats** — real-time bitrate, latency, packet loss, and resolution via RTCPeerConnection.getStats()
- **Preview Before Joining** — check camera, mic, and set your display name before entering a room
- **Instant Rooms** — one click to create, share a link to invite anyone

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (CLI v4), Framer Motion
- **Signaling**: Bun, Hono, native WebSockets
- **WebRTC**: Native browser APIs (RTCPeerConnection, RTCDataChannel, getUserMedia, MediaRecorder)
- **Audio Processing**: Web Audio API (BiquadFilterNode, DynamicsCompressorNode, AnalyserNode, GainNode)
- **Infrastructure**: Vercel (frontend) + Railway (signaling server)
- **Monorepo**: Bun workspaces + Turborepo

## Project Structure

```
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/                    # Pages (landing, room)
│   │   ├── components/             # UI components (video, chat, controls, captions, stats)
│   │   ├── hooks/                  # WebRTC, signaling, media, captions, noise suppression, stats
│   │   └── lib/                    # Types, config, data channel messages
│   └── signaling/                  # Bun + Hono WebSocket server
│       └── src/                    # Room management, message relay
├── package.json                    # Workspace root
└── turbo.json                      # Turborepo config
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Setup

```bash
bun install

# Terminal 1 — signaling server
cd apps/signaling && bun run dev

# Terminal 2 — frontend
cd apps/web && bun run dev
```

Open [http://localhost:3000](http://localhost:3000), create a room, and open the link in a second tab to test.

### Environment Variables

**Frontend** (`apps/web/.env.local`):

```
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:4000/ws
```

For production, set this in your Vercel dashboard:

```
NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.railway.app/ws
```

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo in Vercel
2. Set root directory to `apps/web`
3. Add `NEXT_PUBLIC_SIGNALING_URL` as an environment variable

### Signaling Server (Railway)

1. Create a Railway project and connect your GitHub repo
2. Set root directory to `apps/signaling`
3. Optionally set watch paths to `apps/signaling/**`
4. Railway provides a public URL with automatic HTTPS

Both auto-deploy on every push to `main`.

## Architecture

```
Browser A ←→ Signaling Server ←→ Browser B
    │              (JSON)              │
    │                                  │
    ├──── P2P Media (video/audio) ─────┤
    ├──── P2P Data (chat/files) ───────┤
    └──── P2P Captions ────────────────┘
              (All Encrypted)
```

The signaling server is a lightweight Bun + Hono WebSocket server that relays small JSON messages (SDP offers/answers, ICE candidates) to facilitate the initial WebRTC handshake. Once the peer connection is established, all media streams, chat messages, file transfers, and captions flow directly between browsers — encrypted via DTLS/SRTP, with zero server involvement.

## License

MIT
