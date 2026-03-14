export type SignalMessage =
  | { type: "join"; roomId: string; peerId: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit; targetPeerId: string; fromPeerId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; targetPeerId: string; fromPeerId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; targetPeerId: string; fromPeerId: string };

export type ServerMessage =
  | { type: "peer-joined"; peerId: string; peers: string[] }
  | { type: "peer-left"; peerId: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit; fromPeerId: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; fromPeerId: string }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; fromPeerId: string }
  | { type: "error"; message: string };
