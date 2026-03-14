export type SignalMessage =
  | { type: "join"; roomId: string; peerId: string; displayName: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit; targetPeerId: string; fromPeerId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; targetPeerId: string; fromPeerId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; targetPeerId: string; fromPeerId: string };

export interface PeerInfo {
  peerId: string;
  displayName: string;
}

export type ServerMessage =
  | { type: "peer-joined"; peerId: string; displayName: string; peers: PeerInfo[] }
  | { type: "peer-left"; peerId: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit; fromPeerId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; fromPeerId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; fromPeerId: string }
  | { type: "error"; message: string };
