"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { DataMessage } from "@/lib/data-messages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRecognition(): any {
  const W = window as any;
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

interface Caption {
  sender: string;
  text: string;
  timestamp: number;
}

interface UseCaptionsOptions {
  displayName: string;
  sendData: (msg: DataMessage) => void;
  onData: (handler: (msg: DataMessage, fromPeerId: string) => void) => () => void;
  peerNames: Map<string, string>;
}

export function useCaptions({ displayName, sendData, onData, peerNames }: UseCaptionsOptions) {
  const [enabled, setEnabled] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const upsertCaption = useCallback((sender: string, text: string, isFinal: boolean) => {
    setCaptions((prev) => {
      const without = prev.filter((c) => c.sender !== sender);
      return [...without, { sender, text, timestamp: Date.now() }];
    });

    if (isFinal) {
      const existing = clearTimers.current.get(sender);
      if (existing) clearTimeout(existing);
      clearTimers.current.set(
        sender,
        setTimeout(() => {
          setCaptions((prev) => prev.filter((c) => c.sender !== sender));
          clearTimers.current.delete(sender);
        }, 4000)
      );
    }
  }, []);

  useEffect(() => {
    const unsub = onData((msg) => {
      if (msg.type !== "caption") return;
      upsertCaption(msg.sender, msg.text, msg.isFinal);
    });
    return unsub;
  }, [onData, peerNames, upsertCaption]);

  const toggle = useCallback(() => {
    if (enabled) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setEnabled(false);
      setCaptions([]);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      const isFinal = last.isFinal;

      sendData({ type: "caption", text, sender: displayName, isFinal });
      upsertCaption(displayName, text, isFinal);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        recognitionRef.current = null;
        setEnabled(false);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setEnabled(true);
    } catch {
      recognitionRef.current = null;
    }
  }, [enabled, displayName, sendData, upsertCaption]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      clearTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    const W = window as any;
    setIsSupported(!!(W.SpeechRecognition || W.webkitSpeechRecognition));
  }, []);

  return { enabled, toggle, captions, isSupported };
}
