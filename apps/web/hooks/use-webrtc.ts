"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { createPeerConnection } from "@/lib/webrtc";
import { useSignaling } from "./use-signaling";
import { useMediaStream } from "./use-media-stream";
import type { ServerMessage } from "@/lib/types";

export interface PeerState {
  peerId: string;
  displayName: string;
  stream: MediaStream;
  connection: RTCPeerConnection;
}

interface WebRTCOptions {
  initialAudio?: boolean;
  initialVideo?: boolean;
}

export function useWebRTC(roomId: string, options?: WebRTCOptions) {
  const peerId = useRef(nanoid(12));
  const { connect, disconnect, send, onMessage, isConnected } = useSignaling();
  const media = useMediaStream({
    initialAudio: options?.initialAudio,
    initialVideo: options?.initialVideo,
  });
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescriptionSet = useRef<Set<string>>(new Set());
  const peerNames = useRef<Map<string, string>>(new Map());

  const updatePeers = useCallback((fn: (map: Map<string, PeerState>) => void) => {
    fn(peersRef.current);
    setPeers(new Map(peersRef.current));
  }, []);

  const flushIceCandidates = useCallback(async (remotePeerId: string) => {
    const buffered = iceCandidateBuffer.current.get(remotePeerId);
    const peer = peersRef.current.get(remotePeerId);
    if (!buffered || !peer) return;
    for (const candidate of buffered) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    iceCandidateBuffer.current.delete(remotePeerId);
  }, []);

  const createConnection = useCallback(
    (remotePeerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(remotePeerId);
      if (existing) {
        existing.connection.close();
      }

      const pc = createPeerConnection();
      const stream = localStreamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
            targetPeerId: remotePeerId,
            fromPeerId: peerId.current,
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          updatePeers((map) => {
            const entry = map.get(remotePeerId);
            if (entry) {
              entry.stream = remoteStream;
            } else {
              map.set(remotePeerId, {
                peerId: remotePeerId,
                displayName: peerNames.current.get(remotePeerId) || remotePeerId.slice(0, 6),
                stream: remoteStream,
                connection: pc,
              });
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          updatePeers((map) => map.delete(remotePeerId));
        }
      };

      updatePeers((map) => {
        map.set(remotePeerId, {
          peerId: remotePeerId,
          displayName: peerNames.current.get(remotePeerId) || remotePeerId.slice(0, 6),
          stream: new MediaStream(),
          connection: pc,
        });
      });

      return pc;
    },
    [send, updatePeers]
  );

  const handleMessage = useCallback(
    async (msg: ServerMessage) => {
      switch (msg.type) {
        case "peer-joined": {
          if ("displayName" in msg && msg.peerId !== peerId.current) {
            peerNames.current.set(msg.peerId, msg.displayName);
          }
          if (msg.peers.length > 0) {
            for (const peerInfo of msg.peers) {
              peerNames.current.set(peerInfo.peerId, peerInfo.displayName);
              const pc = createConnection(peerInfo.peerId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              send({
                type: "offer",
                sdp: pc.localDescription!,
                targetPeerId: peerInfo.peerId,
                fromPeerId: peerId.current,
              });
            }
          }
          break;
        }
        case "offer": {
          const pc = createConnection(msg.fromPeerId);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          remoteDescriptionSet.current.add(msg.fromPeerId);
          await flushIceCandidates(msg.fromPeerId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({
            type: "answer",
            sdp: pc.localDescription!,
            targetPeerId: msg.fromPeerId,
            fromPeerId: peerId.current,
          });
          break;
        }
        case "answer": {
          const peer = peersRef.current.get(msg.fromPeerId);
          if (peer) {
            await peer.connection.setRemoteDescription(
              new RTCSessionDescription(msg.sdp)
            );
            remoteDescriptionSet.current.add(msg.fromPeerId);
            await flushIceCandidates(msg.fromPeerId);
          }
          break;
        }
        case "ice-candidate": {
          if (!remoteDescriptionSet.current.has(msg.fromPeerId)) {
            const buf = iceCandidateBuffer.current.get(msg.fromPeerId) || [];
            buf.push(msg.candidate);
            iceCandidateBuffer.current.set(msg.fromPeerId, buf);
            return;
          }
          const peer = peersRef.current.get(msg.fromPeerId);
          if (peer) {
            await peer.connection.addIceCandidate(
              new RTCIceCandidate(msg.candidate)
            );
          }
          break;
        }
        case "peer-left": {
          const peer = peersRef.current.get(msg.peerId);
          if (peer) {
            peer.connection.close();
            updatePeers((map) => map.delete(msg.peerId));
          }
          peerNames.current.delete(msg.peerId);
          remoteDescriptionSet.current.delete(msg.peerId);
          iceCandidateBuffer.current.delete(msg.peerId);
          break;
        }
      }
    },
    [createConnection, send, updatePeers, flushIceCandidates]
  );

  const joinRoom = useCallback(async (displayName: string) => {
    const localStream = await media.startMedia();
    if (!localStream) return;

    localStreamRef.current = localStream;

    onMessage(handleMessage);

    await connect();

    send({ type: "join", roomId, peerId: peerId.current, displayName });
  }, [connect, onMessage, send, roomId, media, handleMessage]);

  const leaveRoom = useCallback(() => {
    peersRef.current.forEach((peer) => peer.connection.close());
    peersRef.current.clear();
    setPeers(new Map());
    peerNames.current.clear();
    remoteDescriptionSet.current.clear();
    iceCandidateBuffer.current.clear();
    localStreamRef.current = null;
    media.stopMedia();
    disconnect();
  }, [media, disconnect]);

  const replaceTrackForAllPeers = useCallback((newTrack: MediaStreamTrack) => {
    peersRef.current.forEach((peer) => {
      const sender = peer.connection
        .getSenders()
        .find((s) => s.track?.kind === newTrack.kind);
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((peer) => peer.connection.close());
    };
  }, []);

  return {
    peerId: peerId.current,
    peers,
    joinRoom,
    leaveRoom,
    isConnected,
    replaceTrackForAllPeers,
    ...media,
  };
}
