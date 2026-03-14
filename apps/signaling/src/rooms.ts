import type { ServerWebSocket } from "bun";
import type { PeerInfo } from "./types";

export interface PeerSocket {
  ws: ServerWebSocket<{ peerId: string; roomId: string; displayName: string }>;
  peerId: string;
  displayName: string;
}

const rooms = new Map<string, Map<string, PeerSocket>>();

export function joinRoom(
  roomId: string,
  peerId: string,
  displayName: string,
  ws: ServerWebSocket<{ peerId: string; roomId: string; displayName: string }>
): PeerInfo[] {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  const room = rooms.get(roomId)!;
  room.set(peerId, { ws, peerId, displayName });
  return Array.from(room.values())
    .filter((p) => p.peerId !== peerId)
    .map((p) => ({ peerId: p.peerId, displayName: p.displayName }));
}

export function leaveRoom(roomId: string, peerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (room.size === 0) {
    rooms.delete(roomId);
  }
}

export function getPeer(roomId: string, peerId: string): PeerSocket | undefined {
  return rooms.get(roomId)?.get(peerId);
}

export function broadcastToRoom(roomId: string, excludePeerId: string, message: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [id, peer] of room) {
    if (id !== excludePeerId) {
      peer.ws.send(message);
    }
  }
}
