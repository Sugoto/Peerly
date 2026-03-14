import type { ServerWebSocket } from "bun";

export interface PeerSocket {
  ws: ServerWebSocket<{ peerId: string; roomId: string }>;
  peerId: string;
}

const rooms = new Map<string, Map<string, PeerSocket>>();

export function joinRoom(roomId: string, peerId: string, ws: ServerWebSocket<{ peerId: string; roomId: string }>): string[] {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  const room = rooms.get(roomId)!;
  room.set(peerId, { ws, peerId });
  return Array.from(room.keys()).filter((id) => id !== peerId);
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
