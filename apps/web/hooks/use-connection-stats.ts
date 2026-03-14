"use client";

import { useState, useEffect, useRef } from "react";
import type { PeerState } from "./use-webrtc";

export interface ConnectionStats {
  bitrate: number;
  packetLoss: number;
  roundTripTime: number;
  resolution: string;
}

export function useConnectionStats(peers: Map<string, PeerState>) {
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const prevBytes = useRef(0);
  const prevTimestamp = useRef(0);

  useEffect(() => {
    if (peers.size === 0) {
      setStats(null);
      prevBytes.current = 0;
      prevTimestamp.current = 0;
      return;
    }

    const interval = setInterval(async () => {
      const firstPeer = Array.from(peers.values())[0];
      if (!firstPeer) return;

      try {
        const report = await firstPeer.connection.getStats();
        let totalBytesReceived = 0;
        let packetLoss = 0;
        let rtt = 0;
        let width = 0;
        let height = 0;

        report.forEach((stat) => {
          if (stat.type === "inbound-rtp" && stat.kind === "video") {
            totalBytesReceived += stat.bytesReceived || 0;
            if (stat.packetsLost && stat.packetsReceived) {
              packetLoss = (stat.packetsLost / (stat.packetsReceived + stat.packetsLost)) * 100;
            }
            if (stat.frameWidth) width = stat.frameWidth;
            if (stat.frameHeight) height = stat.frameHeight;
          }
          if (stat.type === "candidate-pair" && stat.state === "succeeded") {
            rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
          }
        });

        const now = Date.now();
        let bitrate = 0;
        if (prevTimestamp.current > 0) {
          const timeDelta = (now - prevTimestamp.current) / 1000;
          const bytesDelta = totalBytesReceived - prevBytes.current;
          bitrate = (bytesDelta * 8) / timeDelta / 1000;
        }
        prevBytes.current = totalBytesReceived;
        prevTimestamp.current = now;

        setStats({
          bitrate: Math.round(bitrate),
          packetLoss: Math.round(packetLoss * 10) / 10,
          roundTripTime: Math.round(rtt),
          resolution: width && height ? `${width}x${height}` : "—",
        });
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [peers.size]);

  return stats;
}
