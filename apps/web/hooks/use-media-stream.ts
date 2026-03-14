"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      cameraStreamRef.current = mediaStream;
      setStream(mediaStream);
      return mediaStream;
    } catch {
      const audioOnly = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch(() => null);
      if (audioOnly) {
        setStream(audioOnly);
        setIsVideoEnabled(false);
      }
      return audioOnly;
    }
  }, []);

  const stopMedia = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const toggleAudio = useCallback(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsAudioEnabled((prev) => !prev);
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoEnabled((prev) => !prev);
  }, [stream]);

  const toggleScreenShare = useCallback(
    async (onTrackReplace?: (track: MediaStreamTrack) => void) => {
      if (!stream) return;

      if (isScreenSharing) {
        const camStream = cameraStreamRef.current;
        if (camStream) {
          const camTrack = camStream.getVideoTracks()[0];
          stream.getVideoTracks().forEach((t) => {
            stream.removeTrack(t);
            t.stop();
          });
          stream.addTrack(camTrack);
          onTrackReplace?.(camTrack);
        }
        setIsScreenSharing(false);
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        stream.getVideoTracks().forEach((t) => {
          stream.removeTrack(t);
        });
        stream.addTrack(screenTrack);
        onTrackReplace?.(screenTrack);
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          const camStream = cameraStreamRef.current;
          if (camStream) {
            const camTrack = camStream.getVideoTracks()[0];
            stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
            stream.addTrack(camTrack);
            onTrackReplace?.(camTrack);
          }
          setIsScreenSharing(false);
        };
      } catch {
        // user cancelled screen share picker
      }
    },
    [stream, isScreenSharing]
  );

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    stream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}
