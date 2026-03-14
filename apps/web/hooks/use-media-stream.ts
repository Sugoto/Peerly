"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface MediaStreamOptions {
  initialAudio?: boolean;
  initialVideo?: boolean;
}

export function useMediaStream(options?: MediaStreamOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(options?.initialAudio ?? false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(options?.initialVideo ?? false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const onTrackReplaceRef = useRef<((track: MediaStreamTrack) => void) | null>(null);

  const getOrCreateStream = useCallback((): MediaStream => {
    if (streamRef.current) return streamRef.current;
    const s = new MediaStream();
    streamRef.current = s;
    setStream(s);
    return s;
  }, []);

  const startMedia = useCallback(async () => {
    const s = getOrCreateStream();
    const wantAudio = options?.initialAudio ?? false;
    const wantVideo = options?.initialVideo ?? false;

    if (!wantAudio && !wantVideo) {
      return s;
    }

    try {
      const constraints: MediaStreamConstraints = {};
      if (wantAudio) constraints.audio = { echoCancellation: true, noiseSuppression: true };
      if (wantVideo) constraints.video = { width: { ideal: 1280 }, height: { ideal: 720 } };

      const media = await navigator.mediaDevices.getUserMedia(constraints);
      media.getTracks().forEach((t) => s.addTrack(t));
      setStream(new MediaStream(s.getTracks()));
      streamRef.current = s;
    } catch {
      if (wantVideo && wantAudio) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioOnly.getTracks().forEach((t) => s.addTrack(t));
          setIsVideoEnabled(false);
          setStream(new MediaStream(s.getTracks()));
          streamRef.current = s;
        } catch {}
      }
    }

    return s;
  }, [options?.initialAudio, options?.initialVideo, getOrCreateStream]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const toggleAudio = useCallback(async () => {
    const s = getOrCreateStream();

    if (isAudioEnabled) {
      s.getAudioTracks().forEach((t) => {
        s.removeTrack(t);
        t.stop();
      });
      setIsAudioEnabled(false);
      setStream(new MediaStream(s.getTracks()));
    } else {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const audioTrack = media.getAudioTracks()[0];
        s.addTrack(audioTrack);
        onTrackReplaceRef.current?.(audioTrack);
        setIsAudioEnabled(true);
        setStream(new MediaStream(s.getTracks()));
      } catch {}
    }
  }, [isAudioEnabled, getOrCreateStream]);

  const toggleVideo = useCallback(async () => {
    const s = getOrCreateStream();

    if (isVideoEnabled) {
      s.getVideoTracks().forEach((t) => {
        s.removeTrack(t);
        t.stop();
      });
      setIsVideoEnabled(false);
      setStream(new MediaStream(s.getTracks()));
    } else {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const videoTrack = media.getVideoTracks()[0];
        s.addTrack(videoTrack);
        onTrackReplaceRef.current?.(videoTrack);
        setIsVideoEnabled(true);
        setStream(new MediaStream(s.getTracks()));
      } catch {}
    }
  }, [isVideoEnabled, getOrCreateStream]);

  const toggleScreenShare = useCallback(
    async (onTrackReplace?: (track: MediaStreamTrack) => void) => {
      const s = getOrCreateStream();

      if (isScreenSharing) {
        s.getVideoTracks().forEach((t) => {
          s.removeTrack(t);
          t.stop();
        });
        setIsScreenSharing(false);
        setIsVideoEnabled(false);
        setStream(new MediaStream(s.getTracks()));
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        s.getVideoTracks().forEach((t) => {
          s.removeTrack(t);
          t.stop();
        });
        s.addTrack(screenTrack);
        onTrackReplace?.(screenTrack);
        setIsScreenSharing(true);
        setIsVideoEnabled(true);
        setStream(new MediaStream(s.getTracks()));

        screenTrack.onended = () => {
          s.getVideoTracks().forEach((t) => {
            s.removeTrack(t);
          });
          setIsScreenSharing(false);
          setIsVideoEnabled(false);
          setStream(new MediaStream(s.getTracks()));
        };
      } catch {}
    },
    [isScreenSharing, getOrCreateStream]
  );

  const setOnTrackReplace = useCallback((fn: (track: MediaStreamTrack) => void) => {
    onTrackReplaceRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
    setOnTrackReplace,
  };
}
