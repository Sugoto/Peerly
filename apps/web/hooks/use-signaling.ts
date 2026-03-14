"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { SIGNALING_URL } from "@/lib/webrtc";
import type { SignalMessage, ServerMessage } from "@/lib/types";

type MessageHandler = (msg: ServerMessage) => void;

export function useSignaling() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<MessageHandler[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingMessages = useRef<SignalMessage[]>([]);

  const flushPending = useCallback(() => {
    while (pendingMessages.current.length > 0) {
      const msg = pendingMessages.current.shift()!;
      wsRef.current?.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(SIGNALING_URL);

      ws.onopen = () => {
        setIsConnected(true);
        flushPending();
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handlersRef.current.forEach((handler) => handler(msg));
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    });
  }, [flushPending]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    pendingMessages.current = [];
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((msg: SignalMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingMessages.current.push(msg);
    }
  }, []);

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { connect, disconnect, send, onMessage, isConnected };
}
