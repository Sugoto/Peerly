"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  computeVerificationCode,
  applyE2EE,
  isEncodedTransformSupported,
} from "@/lib/e2ee";
import type { PeerState } from "./use-webrtc";
import type { DataMessage } from "@/lib/data-messages";

type DataHandler = (msg: DataMessage, fromPeerId: string) => void;

export function useE2EE(
  peers: Map<string, PeerState>,
  sendData: (msg: DataMessage, targetPeerId?: string) => void,
  onData: (handler: DataHandler) => () => void
) {
  const [active, setActive] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const peerKeys = useRef<Map<string, CryptoKey>>(new Map());
  const cleanupFns = useRef<Map<string, () => void>>(new Map());
  const initialized = useRef(false);

  const supported = typeof window !== "undefined" && isEncodedTransformSupported();

  const applyToPeer = useCallback(async (peerId: string, pc: RTCPeerConnection, sharedKey: CryptoKey) => {
    const existing = cleanupFns.current.get(peerId);
    if (existing) existing();
    if (supported) {
      const cleanup = applyE2EE(pc, sharedKey);
      cleanupFns.current.set(peerId, cleanup);
    }
    const code = await computeVerificationCode(sharedKey);
    setVerificationCode(code);
    setActive(true);
  }, [supported]);

  const init = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;

    const keyPair = await generateKeyPair();
    keyPairRef.current = keyPair;
  }, []);

  const broadcastPublicKey = useCallback(async () => {
    if (!keyPairRef.current) return;
    const pubKeyStr = await exportPublicKey(keyPairRef.current.publicKey);
    sendData({ type: "e2ee-pubkey", publicKey: pubKeyStr });
  }, [sendData]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const unsub = onData(async (msg, fromPeerId) => {
      if (msg.type !== "e2ee-pubkey" || !keyPairRef.current) return;

      const remotePubKey = await importPublicKey(msg.publicKey);
      peerKeys.current.set(fromPeerId, remotePubKey);

      const sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, remotePubKey);
      const peer = peers.get(fromPeerId);
      if (peer) {
        await applyToPeer(fromPeerId, peer.connection, sharedKey);
      }

      await broadcastPublicKey();
    });

    return unsub;
  }, [onData, peers, applyToPeer, broadcastPublicKey]);

  useEffect(() => {
    if (!keyPairRef.current || peers.size === 0) return;

    for (const [id] of peers) {
      if (!peerKeys.current.has(id)) {
        broadcastPublicKey();
        break;
      }
    }
  }, [peers.size, broadcastPublicKey]);

  useEffect(() => {
    for (const id of cleanupFns.current.keys()) {
      if (!peers.has(id)) {
        cleanupFns.current.get(id)?.();
        cleanupFns.current.delete(id);
        peerKeys.current.delete(id);
      }
    }
    if (peers.size === 0) {
      setVerificationCode("");
      setActive(false);
    }
  }, [peers]);

  useEffect(() => {
    return () => {
      cleanupFns.current.forEach((fn) => fn());
      cleanupFns.current.clear();
    };
  }, []);

  return { active, supported, verificationCode };
}
