import { Hono } from "hono";
import { cors } from "hono/cors";
import { joinRoom, leaveRoom, getPeer, broadcastToRoom } from "./rooms";
import type { SignalMessage, ServerMessage } from "./types";

const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ status: "ok" }));

const server = Bun.serve({
  port: Number(process.env.PORT) || 4000,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { peerId: "", roomId: "", displayName: "" },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return app.fetch(req);
  },
  websocket: {
    open(ws) {},
    message(ws, raw) {
      try {
        const msg: SignalMessage = JSON.parse(raw as string);

        switch (msg.type) {
          case "join": {
            ws.data.peerId = msg.peerId;
            ws.data.roomId = msg.roomId;
            ws.data.displayName = msg.displayName;
            const existingPeers = joinRoom(msg.roomId, msg.peerId, msg.displayName, ws);
            const joinResponse: ServerMessage = {
              type: "peer-joined",
              peerId: msg.peerId,
              displayName: msg.displayName,
              peers: existingPeers,
            };
            ws.send(JSON.stringify(joinResponse));
            broadcastToRoom(
              msg.roomId,
              msg.peerId,
              JSON.stringify({
                type: "peer-joined",
                peerId: msg.peerId,
                displayName: msg.displayName,
                peers: [],
              } satisfies ServerMessage)
            );
            break;
          }
          case "offer": {
            const target = getPeer(ws.data.roomId, msg.targetPeerId);
            if (target) {
              target.ws.send(
                JSON.stringify({ type: "offer", sdp: msg.sdp, fromPeerId: msg.fromPeerId } satisfies ServerMessage)
              );
            }
            break;
          }
          case "answer": {
            const target = getPeer(ws.data.roomId, msg.targetPeerId);
            if (target) {
              target.ws.send(
                JSON.stringify({ type: "answer", sdp: msg.sdp, fromPeerId: msg.fromPeerId } satisfies ServerMessage)
              );
            }
            break;
          }
          case "ice-candidate": {
            const target = getPeer(ws.data.roomId, msg.targetPeerId);
            if (target) {
              target.ws.send(
                JSON.stringify({
                  type: "ice-candidate",
                  candidate: msg.candidate,
                  fromPeerId: msg.fromPeerId,
                } satisfies ServerMessage)
              );
            }
            break;
          }
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" } satisfies ServerMessage));
      }
    },
    close(ws) {
      if (ws.data.roomId && ws.data.peerId) {
        leaveRoom(ws.data.roomId, ws.data.peerId);
        broadcastToRoom(
          ws.data.roomId,
          ws.data.peerId,
          JSON.stringify({ type: "peer-left", peerId: ws.data.peerId } satisfies ServerMessage)
        );
      }
    },
  },
});

console.log(`Signaling server running on port ${server.port}`);
