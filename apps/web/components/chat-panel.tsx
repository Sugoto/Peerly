"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Paperclip, Download } from "lucide-react";
import type { DataMessage } from "@/lib/data-messages";
import { FILE_CHUNK_SIZE } from "@/lib/data-messages";

interface ChatMessage {
  id: string;
  type: "chat" | "file";
  sender: string;
  isLocal: boolean;
  text?: string;
  fileName?: string;
  fileSize?: number;
  fileData?: Blob;
  timestamp: number;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  sendData: (msg: DataMessage, targetPeerId?: string) => void;
  onData: (handler: (msg: DataMessage, fromPeerId: string) => void) => () => void;
  peerNames: Map<string, string>;
}

export function ChatPanel({
  open,
  onClose,
  displayName,
  sendData,
  onData,
  peerNames,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileChunks = useRef<Map<string, { chunks: string[]; total: number; meta: { name: string; size: number; mimeType: string; sender: string } }>>(new Map());

  useEffect(() => {
    const unsub = onData((msg, fromPeerId) => {
      const senderName = peerNames.get(fromPeerId) || fromPeerId.slice(0, 6);

      if (msg.type === "chat") {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            type: "chat",
            sender: msg.sender,
            isLocal: false,
            text: msg.text,
            timestamp: msg.timestamp,
          },
        ]);
      }

      if (msg.type === "file-meta") {
        fileChunks.current.set(msg.fileId, {
          chunks: new Array(Math.ceil(msg.size / FILE_CHUNK_SIZE)).fill(""),
          total: Math.ceil(msg.size / FILE_CHUNK_SIZE),
          meta: { name: msg.name, size: msg.size, mimeType: msg.mimeType, sender: msg.sender },
        });
      }

      if (msg.type === "file-chunk") {
        const entry = fileChunks.current.get(msg.fileId);
        if (!entry) return;
        entry.chunks[msg.index] = msg.chunk;
        const received = entry.chunks.filter((c) => c !== "").length;
        if (received === entry.total) {
          const binary = atob(entry.chunks.join(""));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: entry.meta.mimeType });
          setMessages((prev) => [
            ...prev,
            {
              id: msg.fileId,
              type: "file",
              sender: entry.meta.sender,
              isLocal: false,
              fileName: entry.meta.name,
              fileSize: entry.meta.size,
              fileData: blob,
              timestamp: Date.now(),
            },
          ]);
          fileChunks.current.delete(msg.fileId);
        }
      }
    });
    return unsub;
  }, [onData, peerNames]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendChat = useCallback(() => {
    if (!input.trim()) return;
    const msg: DataMessage = {
      type: "chat",
      text: input.trim(),
      sender: displayName,
      timestamp: Date.now(),
    };
    sendData(msg);
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, type: "chat", sender: displayName, isLocal: true, text: input.trim(), timestamp: Date.now() },
    ]);
    setInput("");
  }, [input, displayName, sendData]);

  const sendFile = useCallback(
    async (file: File) => {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let base64 = "";
      for (let i = 0; i < bytes.length; i++) base64 += String.fromCharCode(bytes[i]);
      const encoded = btoa(base64);
      const totalChunks = Math.ceil(encoded.length / FILE_CHUNK_SIZE);

      sendData({
        type: "file-meta",
        fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        sender: displayName,
      });

      for (let i = 0; i < totalChunks; i++) {
        const chunk = encoded.slice(i * FILE_CHUNK_SIZE, (i + 1) * FILE_CHUNK_SIZE);
        sendData({ type: "file-chunk", fileId, chunk, index: i, total: totalChunks });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: fileId,
          type: "file",
          sender: displayName,
          isLocal: true,
          fileName: file.name,
          fileSize: file.size,
          fileData: new Blob([buffer], { type: file.type }),
          timestamp: Date.now(),
        },
      ]);
    },
    [displayName, sendData]
  );

  const downloadFile = useCallback((msg: ChatMessage) => {
    if (!msg.fileData) return;
    const url = URL.createObjectURL(msg.fileData);
    const a = document.createElement("a");
    a.href = url;
    a.download = msg.fileName || "file";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-border bg-background transition-transform duration-300 ease-in-out sm:w-80 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground pt-8">
            Messages are encrypted and peer-to-peer.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isLocal ? "items-end" : "items-start"}`}
          >
            <span className="text-[10px] text-muted-foreground mb-0.5">
              {msg.sender}
            </span>
            {msg.type === "chat" ? (
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.isLocal
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            ) : (
              <div
                className={`flex max-w-[85%] items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer ${
                  msg.isLocal ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
                onClick={() => downloadFile(msg)}
              >
                <Download className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{msg.fileName}</div>
                  <div className="text-[10px] opacity-70">{formatSize(msg.fileSize || 0)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Send file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) sendFile(file);
              e.target.value = "";
            }}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Type a message..."
            className="h-9 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={sendChat}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
