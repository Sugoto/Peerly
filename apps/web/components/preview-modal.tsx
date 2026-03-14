"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface PreviewModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  roomId: string;
  roomIdEditable?: boolean;
  onJoin: (settings: {
    roomId: string;
    displayName: string;
    audio: boolean;
    video: boolean;
  }) => void;
}

export function PreviewModal({
  open,
  onOpenChange,
  roomId: initialRoomId,
  roomIdEditable = false,
  onJoin,
}: PreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [displayName, setDisplayName] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    setRoomId(initialRoomId);
  }, [initialRoomId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        setHasStream(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      })
      .catch(() => {
        setVideoEnabled(false);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setHasStream(false);
      setAudioEnabled(true);
      setVideoEnabled(true);
    };
  }, [open]);

  const toggleAudio = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setAudioEnabled((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoEnabled((prev) => !prev);
  }, []);

  const handleJoin = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onJoin({
      roomId: roomId.trim() || initialRoomId,
      displayName: displayName.trim() || "Guest",
      audio: audioEnabled,
      video: videoEnabled,
    });
  }, [roomId, initialRoomId, displayName, audioEnabled, videoEnabled, onJoin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-md" showCloseButton={!!onOpenChange}>
        <DialogHeader>
          <DialogTitle>Ready to join?</DialogTitle>
          <DialogDescription>
            Preview your camera and adjust settings before entering the room.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg bg-muted aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full scale-x-[-1] object-cover ${!videoEnabled || !hasStream ? "hidden" : ""}`}
          />
          {(!videoEnabled || !hasStream) && (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                <VideoOff className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant={audioEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                className="h-10 w-10 rounded-full"
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant={videoEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                className="h-10 w-10 rounded-full"
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="h-10"
              autoFocus
            />
          </div>

          {roomIdEditable && (
            <div className="space-y-1.5">
              <label htmlFor="room-id" className="text-sm font-medium">
                Room ID
              </label>
              <Input
                id="room-id"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter a custom room name"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Change this to use a custom room name instead.
              </p>
            </div>
          )}

          {!roomIdEditable && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Room</label>
              <p className="rounded-lg border border-input bg-input/30 px-2.5 py-2 text-sm font-mono">
                {roomId}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleJoin}
            disabled={!roomId.trim()}
            className="w-full cursor-pointer sm:w-auto"
          >
            Join Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
