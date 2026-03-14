"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { createPeerConnection } from "@/lib/webrtc";
import { useSignaling } from "./use-signaling";
import { useMediaStream } from "./use-media-stream";
import type { ServerMessage } from "@/lib/types";
import { encodeMessage, decodeMessage, type DataMessage } from "@/lib/data-messages";

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

type DataHandler = (msg: DataMessage, fromPeerId: string) => void;

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
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const dataHandlers = useRef<DataHandler[]>([]);

  const updatePeers = useCallback((fn: (map: Map<string, PeerState>) => void) => {
    fn(peersRef.current);
    setPeers(new Map(peersRef.current));
  }, []);

  const onData = useCallback((handler: DataHandler) => {
    dataHandlers.current.push(handler);
    return () => {
      dataHandlers.current = dataHandlers.current.filter((h) => h !== handler);
    };
  }, []);

  const sendData = useCallback((msg: DataMessage, targetPeerId?: string) => {
    const encoded = encodeMessage(msg);
    if (targetPeerId) {
      const ch = dataChannels.current.get(targetPeerId);
      if (ch?.readyState === "open") ch.send(encoded);
    } else {
      dataChannels.current.forEach((ch) => {
        if (ch.readyState === "open") ch.send(encoded);
      });
    }
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

  const setupDataChannel = useCallback((ch: RTCDataChannel, remotePeerId: string) => {
    ch.onopen = () => {
      dataChannels.current.set(remotePeerId, ch);
    };
    ch.onmessage = (event) => {
      const msg = decodeMessage(event.data);
      if (msg) {
        dataHandlers.current.forEach((h) => h(msg, remotePeerId));
      }
    };
    ch.onclose = () => {
      dataChannels.current.delete(remotePeerId);
    };
    if (ch.readyState === "open") {
      dataChannels.current.set(remotePeerId, ch);
    }
  }, []);

  const createConnection = useCallback(
    (remotePeerId: string, isInitiator: boolean): RTCPeerConnection => {
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

      if (isInitiator) {
        const ch = pc.createDataChannel("data");
        setupDataChannel(ch, remotePeerId);
      } else {
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel, remotePeerId);
        };
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
          dataChannels.current.delete(remotePeerId);
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
    [send, updatePeers, setupDataChannel]
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
              const pc = createConnection(peerInfo.peerId, true);
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
          const pc = createConnection(msg.fromPeerId, false);
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
          dataChannels.current.delete(msg.peerId);
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
    for (let attempt = 0; attempt < 3; attempt++) {
      const stream = await media.startMedia();
      if (stream) {
        localStreamRef.current = stream;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    onMessage(handleMessage);

    try {
      await connect();
    } catch {
      return;
    }

    send({ type: "join", roomId, peerId: peerId.current, displayName });
  }, [connect, onMessage, send, roomId, media, handleMessage]);

  const leaveRoom = useCallback(() => {
    peersRef.current.forEach((peer) => peer.connection.close());
    peersRef.current.clear();
    dataChannels.current.clear();
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
    sendData,
    onData,
    ...media,
  };
}
