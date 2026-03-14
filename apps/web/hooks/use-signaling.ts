"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { getSignalingUrl } from "@/lib/webrtc";
import type { SignalMessage, ServerMessage } from "@/lib/types";

type MessageHandler = (msg: ServerMessage) => void;

export function useSignaling() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<MessageHandler[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingMessages = useRef<SignalMessage[]>([]);
  const intentionalClose = useRef(false);
  const lastJoinMsg = useRef<SignalMessage | null>(null);

  const flushPending = useCallback(() => {
    while (pendingMessages.current.length > 0) {
      const msg = pendingMessages.current.shift()!;
      wsRef.current?.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const url = getSignalingUrl();
      if (!url) {
        reject(new Error("No signaling URL"));
        return;
      }

      intentionalClose.current = false;
      const ws = new WebSocket(url);
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsConnected(true);
          flushPending();
          resolve();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handlersRef.current.forEach((handler) => handler(msg));
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error("Connection closed"));
        }

        if (!intentionalClose.current) {
          reconnectTimeoutRef.current = setTimeout(async () => {
            try {
              await connectFn();
              if (lastJoinMsg.current) {
                sendFn(lastJoinMsg.current);
              }
            } catch {}
          }, 2000);
        }
      };

      ws.onerror = () => {};

      wsRef.current = ws;
    });
  }, [flushPending]);

  const connectFn = connect;

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    clearTimeout(reconnectTimeoutRef.current);
    pendingMessages.current = [];
    lastJoinMsg.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((msg: SignalMessage) => {
    if (msg.type === "join") {
      lastJoinMsg.current = msg;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingMessages.current.push(msg);
    }
  }, []);

  const sendFn = send;

  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { connect, disconnect, send, onMessage, isConnected };
}
