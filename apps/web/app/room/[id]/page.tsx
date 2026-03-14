"use client";

import { useEffect, useRef, useCallback, useState, use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useCaptions } from "@/hooks/use-captions";
import { useConnectionStats } from "@/hooks/use-connection-stats";
import { useNoiseSuppression } from "@/hooks/use-noise-suppression";
import { ParticipantGrid } from "@/components/participant-grid";
import { RoomControls } from "@/components/room-controls";
import { ConnectionStatus } from "@/components/connection-status";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ChatPanel } from "@/components/chat-panel";
import { CaptionsOverlay } from "@/components/captions-overlay";
import { StatsOverlay } from "@/components/stats-overlay";
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
  const [chatOpen, setChatOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

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
    sendData,
    onData,
  } = useWebRTC(roomId, mediaOptions);

  const peerNames = useMemo(() => {
    const map = new Map<string, string>();
    peers.forEach((p) => map.set(p.peerId, p.displayName));
    return map;
  }, [peers]);

  const captionsHook = useCaptions({
    displayName: displayName || "You",
    sendData,
    onData,
    peerNames,
  });

  const connectionStats = useConnectionStats(peers);
  const noiseSuppression = useNoiseSuppression();

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

  const handleNoiseSuppression = useCallback(() => {
    const replaceAudio = (track: MediaStreamTrack) => {
      replaceTrackForAllPeers(track);
    };
    noiseSuppression.toggle(stream, replaceAudio);
  }, [noiseSuppression, stream, replaceTrackForAllPeers]);

  if (showPreview) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <PreviewModal open roomId={roomId} onJoin={handlePreviewJoin} />
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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Peerly Room {roomId}</h1>
          <CopyLinkButton roomId={roomId} />
        </div>
        <ConnectionStatus isConnected={isConnected} peerCount={peers.size} />
      </motion.header>

      <div className="relative flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          <ParticipantGrid
            localStream={stream}
            peers={peers}
            localName={displayName || "You"}
          />
          <CaptionsOverlay captions={captionsHook.captions} />
          <StatsOverlay stats={connectionStats} visible={statsVisible} />
        </main>

        <ChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          displayName={displayName || "You"}
          sendData={sendData}
          onData={onData}
          peerNames={peerNames}
        />
      </div>

      <footer className="flex justify-center pb-4 pt-2">
        <RoomControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isChatOpen={chatOpen}
          isCaptionsEnabled={captionsHook.enabled}
          isCaptionsSupported={captionsHook.isSupported}
          isStatsVisible={statsVisible}
          isNoiseSuppressionEnabled={noiseSuppression.enabled}
          peerCount={peers.size}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleScreenShare}
          onToggleChat={() => setChatOpen((prev) => !prev)}
          onToggleCaptions={captionsHook.toggle}
          onToggleStats={() => setStatsVisible((prev) => !prev)}
          onToggleNoiseSuppression={handleNoiseSuppression}
          onLeave={handleLeave}
        />
      </footer>
    </div>
  );
}
