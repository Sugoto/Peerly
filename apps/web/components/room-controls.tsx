"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Captions,
  Activity,
  AudioLines,
} from "lucide-react";

interface RoomControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  isCaptionsEnabled: boolean;
  isCaptionsSupported: boolean;
  isStatsVisible: boolean;
  isNoiseSuppressionEnabled: boolean;
  unreadChatCount: number;
  peerCount: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleCaptions: () => void;
  onToggleStats: () => void;
  onToggleNoiseSuppression: () => void;
  onLeave: () => void;
}

function ControlButton({
  tooltip,
  icon: Icon,
  onClick,
  variant = "secondary",
  className = "",
  disabled = false,
}: {
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "secondary" | "destructive" | "default";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={`h-10 w-10 rounded-full sm:h-11 sm:w-11 ${className}`}
          />
        }
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function RoomControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isChatOpen,
  isCaptionsEnabled,
  isCaptionsSupported,
  isStatsVisible,
  isNoiseSuppressionEnabled,
  unreadChatCount,
  peerCount,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleCaptions,
  onToggleStats,
  onToggleNoiseSuppression,
  onLeave,
}: RoomControlsProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-4 py-3 backdrop-blur-lg sm:gap-3 sm:px-6"
    >
      <ControlButton
        tooltip={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        icon={isAudioEnabled ? Mic : MicOff}
        onClick={onToggleAudio}
        variant={isAudioEnabled ? "secondary" : "destructive"}
      />
      <ControlButton
        tooltip={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        icon={isVideoEnabled ? Video : VideoOff}
        onClick={onToggleVideo}
        variant={isVideoEnabled ? "secondary" : "destructive"}
      />

      <div className="mx-0.5 h-8 w-px bg-border sm:mx-1" />

      <ControlButton
        tooltip={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
        icon={isScreenSharing ? MonitorOff : Monitor}
        onClick={onToggleScreenShare}
        variant={isScreenSharing ? "destructive" : "secondary"}
      />
      <ControlButton
        tooltip={!isAudioEnabled ? "Enable mic first" : isNoiseSuppressionEnabled ? "Disable noise suppression" : "Enable noise suppression"}
        icon={AudioLines}
        onClick={onToggleNoiseSuppression}
        variant={isNoiseSuppressionEnabled ? "default" : "secondary"}
        disabled={!isAudioEnabled}
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isChatOpen ? "default" : "secondary"}
              size="icon"
              onClick={onToggleChat}
              className="relative h-10 w-10 rounded-full sm:h-11 sm:w-11"
            />
          }
        >
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {isChatOpen ? "Close chat" : "Open chat"}
        </TooltipContent>
      </Tooltip>
      {isCaptionsSupported && (
        <ControlButton
          tooltip={isCaptionsEnabled ? "Turn off captions" : "Turn on captions"}
          icon={Captions}
          onClick={onToggleCaptions}
          variant={isCaptionsEnabled ? "default" : "secondary"}
          className="hidden sm:flex"
        />
      )}
      {peerCount > 0 && (
        <ControlButton
          tooltip={isStatsVisible ? "Hide connection stats" : "Show connection stats"}
          icon={Activity}
          onClick={onToggleStats}
          variant={isStatsVisible ? "default" : "secondary"}
          className="hidden sm:flex"
        />
      )}

      <div className="mx-0.5 h-8 w-px bg-border sm:mx-1" />

      <ControlButton
        tooltip="Leave room"
        icon={PhoneOff}
        onClick={onLeave}
        variant="destructive"
      />
    </motion.div>
  );
}
