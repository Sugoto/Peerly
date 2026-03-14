"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { PeerState } from "./use-webrtc";

type QualityLevel = "high" | "medium" | "low";

const QUALITY_PROFILES: Record<QualityLevel, { maxBitrate: number; maxFramerate: number; scaleDown: number }> = {
  high: { maxBitrate: 2_500_000, maxFramerate: 30, scaleDown: 1 },
  medium: { maxBitrate: 1_000_000, maxFramerate: 24, scaleDown: 2 },
  low: { maxBitrate: 400_000, maxFramerate: 15, scaleDown: 4 },
};

export function useAdaptiveBitrate(peers: Map<string, PeerState>) {
  const [quality, setQuality] = useState<QualityLevel>("high");
  const prevBytesSent = useRef<Map<string, number>>(new Map());
  const prevTimestamps = useRef<Map<string, number>>(new Map());
  const degradeCount = useRef(0);
  const improveCount = useRef(0);

  const applyQuality = useCallback(async (level: QualityLevel) => {
    const profile = QUALITY_PROFILES[level];
    for (const peer of peers.values()) {
      const senders = peer.connection.getSenders();
      for (const sender of senders) {
        if (sender.track?.kind !== "video") continue;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = profile.maxBitrate;
        params.encodings[0].maxFramerate = profile.maxFramerate;
        params.encodings[0].scaleResolutionDownBy = profile.scaleDown;
        try {
          await sender.setParameters(params);
        } catch {}
      }
    }
    setQuality(level);
  }, [peers]);

  useEffect(() => {
    if (peers.size === 0) {
      setQuality("high");
      degradeCount.current = 0;
      improveCount.current = 0;
      prevBytesSent.current.clear();
      prevTimestamps.current.clear();
      return;
    }

    const interval = setInterval(async () => {
      let totalPacketLoss = 0;
      let totalRtt = 0;
      let measurements = 0;

      for (const [id, peer] of peers) {
        try {
          const report = await peer.connection.getStats();
          report.forEach((stat: any) => {
            if (stat.type === "outbound-rtp" && stat.kind === "video") {
              if (stat.packetsLost !== undefined && stat.packetsSent) {
                totalPacketLoss += stat.packetsLost / (stat.packetsSent + stat.packetsLost) * 100;
                measurements++;
              }
            }
            if (stat.type === "candidate-pair" && stat.state === "succeeded" && stat.currentRoundTripTime) {
              totalRtt += stat.currentRoundTripTime * 1000;
            }
          });
        } catch {}
      }

      if (measurements === 0) return;

      const avgPacketLoss = totalPacketLoss / measurements;
      const avgRtt = totalRtt / Math.max(measurements, 1);

      const shouldDegrade = avgPacketLoss > 5 || avgRtt > 300;
      const shouldImprove = avgPacketLoss < 1 && avgRtt < 100;

      if (shouldDegrade) {
        degradeCount.current++;
        improveCount.current = 0;
        if (degradeCount.current >= 3) {
          degradeCount.current = 0;
          setQuality((prev) => {
            const next = prev === "high" ? "medium" : prev === "medium" ? "low" : "low";
            if (next !== prev) applyQuality(next);
            return next;
          });
        }
      } else if (shouldImprove) {
        improveCount.current++;
        degradeCount.current = 0;
        if (improveCount.current >= 5) {
          improveCount.current = 0;
          setQuality((prev) => {
            const next = prev === "low" ? "medium" : prev === "medium" ? "high" : "high";
            if (next !== prev) applyQuality(next);
            return next;
          });
        }
      } else {
        degradeCount.current = 0;
        improveCount.current = 0;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [peers.size, applyQuality]);

  return quality;
}
