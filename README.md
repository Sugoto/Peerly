# StreamLink — P2P Video Streaming

Free peer-to-peer video chat. Create a room, share the link, connect instantly.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Signaling**: Bun, Hono, native WebSockets
- **WebRTC**: Native browser APIs with Google STUN + Metered Open Relay TURN
- **Deployment**: Vercel (frontend) + Railway (signaling server)

## Local Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Setup

```bash
bun install

# Start signaling server (terminal 1)
cd apps/signaling && bun run dev

# Start Next.js frontend (terminal 2)
cd apps/web && bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and create a room.

### Environment Variables

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:4000/ws
```

For production, set this to your deployed signaling server URL:
```
NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.railway.app/ws
```

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel, set root directory to `apps/web`
3. Add `NEXT_PUBLIC_SIGNALING_URL` environment variable pointing to your signaling server

### Signaling Server (Railway)

1. Create a new Railway project
2. Deploy from the `apps/signaling` directory (Railway auto-detects the Dockerfile)
3. Railway provides a public URL with HTTPS — use `wss://` prefix

## Architecture

```
Browser A ←→ Signaling Server ←→ Browser B
         ↕                           ↕
      STUN/TURN                   STUN/TURN
         ↕                           ↕
Browser A ←————— Direct P2P ————→ Browser B
```

The signaling server only facilitates the initial WebRTC handshake (SDP offers/answers and ICE candidates). Once connected, all media streams flow directly between peers.
