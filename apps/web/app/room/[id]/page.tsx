"use client";

import { useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/use-webrtc";
import { ParticipantGrid } from "@/components/participant-grid";
import { RoomControls } from "@/components/room-controls";
import { ConnectionStatus } from "@/components/connection-status";

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const joinedRef = useRef(false);

  const {
    peerId,
    peers,
    joinRoom,
    leaveRoom,
    isConnected,
    stream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    replaceTrackForAllPeers,
  } = useWebRTC(roomId);

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    joinRoom();
  }, []);

  useEffect(() => {
    const prevPeerCount = peers.size;
    if (prevPeerCount > 0) {
      const lastPeer = Array.from(peers.values()).pop();
      if (lastPeer) {
        toast.info(`Peer ${lastPeer.peerId.slice(0, 6)} joined`);
      }
    }
  }, [peers.size]);

  const handleLeave = useCallback(() => {
    leaveRoom();
    router.push("/");
  }, [leaveRoom, router]);

  const handleScreenShare = useCallback(() => {
    toggleScreenShare(replaceTrackForAllPeers);
  }, [toggleScreenShare, replaceTrackForAllPeers]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Room {roomId}</h1>
        </div>
        <ConnectionStatus isConnected={isConnected} peerCount={peers.size} />
      </motion.header>

      <main className="flex-1 overflow-hidden">
        <ParticipantGrid
          localStream={stream}
          peers={peers}
          peerId={peerId}
        />
      </main>

      <footer className="flex justify-center pb-4 pt-2">
        <RoomControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleScreenShare}
          onLeave={handleLeave}
          roomId={roomId}
        />
      </footer>
    </div>
  );
}
