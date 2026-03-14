"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Link,
  PhoneOff,
} from "lucide-react";
import { toast } from "sonner";

interface RoomControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  roomId: string;
}

export function RoomControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  roomId,
}: RoomControlsProps) {
  const copyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Room link copied to clipboard");
  };

  const controls = [
    {
      icon: isAudioEnabled ? Mic : MicOff,
      onClick: onToggleAudio,
      active: isAudioEnabled,
      label: isAudioEnabled ? "Mute" : "Unmute",
    },
    {
      icon: isVideoEnabled ? Video : VideoOff,
      onClick: onToggleVideo,
      active: isVideoEnabled,
      label: isVideoEnabled ? "Camera Off" : "Camera On",
    },
    {
      icon: isScreenSharing ? MonitorOff : Monitor,
      onClick: onToggleScreenShare,
      active: !isScreenSharing,
      label: isScreenSharing ? "Stop Sharing" : "Share Screen",
    },
    {
      icon: Link,
      onClick: copyLink,
      active: true,
      label: "Copy Link",
    },
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card/80 px-6 py-3 backdrop-blur-lg"
    >
      {controls.map(({ icon: Icon, onClick, active, label }) => (
        <Button
          key={label}
          variant={active ? "secondary" : "destructive"}
          size="icon"
          onClick={onClick}
          className="h-11 w-11 rounded-full"
          title={label}
        >
          <Icon className="h-5 w-5" />
        </Button>
      ))}
      <div className="mx-1 h-8 w-px bg-border" />
      <Button
        variant="destructive"
        size="icon"
        onClick={onLeave}
        className="h-11 w-11 rounded-full"
        title="Leave Room"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
