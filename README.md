# Peerly — Encrypted P2P Communication

Free, encrypted peer-to-peer video and audio calls. Create a room, share the link, connect instantly. No sign-ups, no downloads, no servers touching your data.

## Features

- **Video & Audio Calls** — full HD video or audio-only, your choice
- **End-to-End Encrypted** — DTLS + SRTP encryption on every stream
- **Peer-to-Peer** — media flows directly between browsers, never through a server
- **Instant Rooms** — one click to create, share a link to invite anyone
- **Preview Before Joining** — check camera, mic, and set your display name before entering
- **Screen Sharing** — share your screen with all participants
- **Works Everywhere** — desktop, tablet, or phone — any modern browser

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (CLI v4), Framer Motion
- **Signaling**: Bun, Hono, native WebSockets
- **WebRTC**: Native browser APIs (RTCPeerConnection, getUserMedia) with Google STUN servers
- **Infrastructure**: Vercel (frontend) + Railway (signaling server)
- **Monorepo**: npm workspaces + Turborepo

## Project Structure

```
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # Pages (landing, room)
│   │   ├── components/         # UI components
│   │   ├── hooks/              # WebRTC, signaling, media hooks
│   │   └── lib/                # Types, config, utilities
│   └── signaling/              # Bun + Hono WebSocket server
│       └── src/                # Room management, message relay
├── package.json                # Workspace root
└── turbo.json                  # Turborepo config
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
    └──── Direct P2P Media Stream ─────┘
              (Encrypted)
```

The signaling server is a lightweight Bun + Hono WebSocket server that relays small JSON messages (SDP offers/answers, ICE candidates) to facilitate the initial WebRTC handshake. Once the peer connection is established, all audio and video streams flow directly between browsers — encrypted, with zero server involvement.

## License

MIT
