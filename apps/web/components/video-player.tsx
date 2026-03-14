"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
  isLocal?: boolean;
  className?: string;
}

export function VideoPlayer({
  stream,
  muted = false,
  label,
  isLocal = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled) ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border border-border",
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn(
          "h-full w-full object-cover",
          isLocal && "scale-x-[-1]",
          !hasVideo && "hidden"
        )}
      />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {label?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}
      {label && (
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
          {label}
          {isLocal && " (You)"}
        </div>
      )}
    </motion.div>
  );
}
