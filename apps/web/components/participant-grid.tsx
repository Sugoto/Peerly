"use client";

import { AnimatePresence } from "framer-motion";
import { VideoPlayer } from "./video-player";
import type { PeerState } from "@/hooks/use-webrtc";
import { cn } from "@/lib/utils";

interface ParticipantGridProps {
  localStream: MediaStream | null;
  peers: Map<string, PeerState>;
  localName: string;
}

export function ParticipantGrid({
  localStream,
  peers,
  localName,
}: ParticipantGridProps) {
  const peerArray = Array.from(peers.values());
  const total = peerArray.length + 1;

  const gridClass = cn(
    "grid h-full w-full gap-2 p-2",
    total === 1 && "grid-cols-1",
    total === 2 && "grid-cols-1 md:grid-cols-2",
    total >= 3 && total <= 4 && "grid-cols-2",
    total >= 5 && total <= 6 && "grid-cols-2 md:grid-cols-3",
    total > 6 && "grid-cols-3 md:grid-cols-4"
  );

  return (
    <div className={gridClass}>
      <AnimatePresence mode="popLayout">
        <VideoPlayer
          key="local"
          stream={localStream}
          muted
          isLocal
          label={localName}
          className="min-h-[200px]"
        />
        {peerArray.map((peer) => (
          <VideoPlayer
            key={peer.peerId}
            stream={peer.stream}
            label={peer.displayName}
            className="min-h-[200px]"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
