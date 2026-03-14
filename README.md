# Peerly — Encrypted P2P Communication

Free, encrypted peer-to-peer video and audio calls. Create a room, share the link, connect instantly. No sign-ups, no downloads, no servers touching your data.

## Features

- **End-to-End Encrypted** — AES-256-GCM frame encryption with automatic ECDH P-256 key exchange via WebRTC Encoded Transform. Keys are negotiated over the data channel — the signaling server never sees them. Verification codes let peers confirm no MITM attack.
- **Adaptive Bitrate** — monitors packet loss and RTT in real-time, automatically adjusts video resolution, framerate, and bitrate across three quality tiers (high/medium/low) using `RTCRtpSender.setParameters()`
- **P2P Chat & File Sharing** — text messages and chunked file transfers over encrypted RTCDataChannel. No server involved, no file size limits.
- **Noise Suppression** — Web Audio DSP pipeline with high-pass filter, low-pass filter, noise gate (volume-based), and dynamic compressor
- **Live Captions** — real-time speech-to-text via browser Speech Recognition API, broadcast to all peers over data channel
- **Screen Sharing** — one-click screen share, properly releases camera hardware when switching
- **Connection Stats** — real-time bitrate, latency, packet loss, resolution, and quality tier via `RTCPeerConnection.getStats()`
- **Hardware-Aware Media** — camera and mic are only acquired when enabled, fully released (`track.stop()`) when disabled. No phantom green lights.
- **Preview Before Joining** — check camera, mic, and set your display name before entering a room
- **Instant Rooms** — one click to create, share a link to invite anyone

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (CLI v4), Framer Motion
- **Signaling**: Bun, Hono, native WebSockets
- **WebRTC**: Native browser APIs (RTCPeerConnection, RTCDataChannel, RTCRtpSender, Encoded Transform)
- **Encryption**: Web Crypto API (ECDH P-256, AES-256-GCM, PBKDF2), WebRTC Encoded Transform
- **Audio Processing**: Web Audio API (BiquadFilterNode, DynamicsCompressorNode, AnalyserNode, GainNode)
- **Infrastructure**: Vercel (frontend) + Railway (signaling server)
- **Monorepo**: Bun workspaces + Turborepo

## Project Structure

```
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/                    # Pages (landing, room)
│   │   ├── components/             # UI (video, chat, controls, captions, stats, preview)
│   │   ├── hooks/                  # WebRTC, signaling, media, E2EE, captions, noise, adaptive bitrate, stats
│   │   └── lib/                    # E2EE crypto, data channel messages, WebRTC config
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
    ├──── P2P Media (video/audio) ─────┤  ← DTLS/SRTP + AES-256-GCM frame encryption
    ├──── P2P Data (chat/files) ───────┤  ← DTLS encrypted data channel
    ├──── P2P Captions ────────────────┤  ← DTLS encrypted data channel
    └──── ECDH Key Exchange ───────────┘  ← Public keys exchanged via data channel
```

The signaling server is a lightweight Bun + Hono WebSocket server that relays small JSON messages (SDP offers/answers, ICE candidates) to facilitate the initial WebRTC handshake. Once connected, all media, chat, files, and captions flow directly between browsers. E2EE keys are exchanged over the data channel so the signaling server has zero knowledge of the encryption keys.

## License

MIT
