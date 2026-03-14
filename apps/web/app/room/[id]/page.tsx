"use client";

import { useEffect, useRef, useCallback, useState, use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/use-webrtc";
import { ParticipantGrid } from "@/components/participant-grid";
import { RoomControls } from "@/components/room-controls";
import { ConnectionStatus } from "@/components/connection-status";
import { PreviewModal } from "@/components/preview-modal";

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinedRef = useRef(false);

  const cameFromLanding = searchParams.has("name");
  const [showPreview, setShowPreview] = useState(!cameFromLanding);
  const [displayName, setDisplayName] = useState(
    searchParams.get("name") || ""
  );

  const mediaOptions = useMemo(
    () => ({
      initialAudio: searchParams.get("audio") !== "false",
      initialVideo: searchParams.get("video") !== "false",
    }),
    [searchParams]
  );

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
  } = useWebRTC(roomId, mediaOptions);

  useEffect(() => {
    if (!cameFromLanding || joinedRef.current) return;
    joinedRef.current = true;
    joinRoom(displayName || "Guest");
  }, []);

  const prevPeerCount = useRef(0);
  useEffect(() => {
    if (peers.size > prevPeerCount.current) {
      const peerArray = Array.from(peers.values());
      const newest = peerArray[peerArray.length - 1];
      if (newest) {
        toast.info(`${newest.displayName} joined`);
      }
    }
    prevPeerCount.current = peers.size;
  }, [peers.size]);

  const handlePreviewJoin = useCallback(
    (settings: {
      roomId: string;
      displayName: string;
      audio: boolean;
      video: boolean;
    }) => {
      setShowPreview(false);
      setDisplayName(settings.displayName);
      joinedRef.current = true;
      joinRoom(settings.displayName);
    },
    [joinRoom]
  );

  const handleLeave = useCallback(() => {
    leaveRoom();
    router.push("/");
  }, [leaveRoom, router]);

  const handleScreenShare = useCallback(() => {
    toggleScreenShare(replaceTrackForAllPeers);
  }, [toggleScreenShare, replaceTrackForAllPeers]);

  if (showPreview) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <PreviewModal
          open
          roomId={roomId}
          onJoin={handlePreviewJoin}
        />
      </div>
    );
  }

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
          localName={displayName || "You"}
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
