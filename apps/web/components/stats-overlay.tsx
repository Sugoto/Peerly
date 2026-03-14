"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStats } from "@/hooks/use-connection-stats";
import { Activity } from "lucide-react";

interface StatsOverlayProps {
  stats: ConnectionStats | null;
  visible: boolean;
  qualityLevel?: string;
}

export function StatsOverlay({ stats, visible, qualityLevel }: StatsOverlayProps) {
  return (
    <AnimatePresence>
      {visible && stats && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute top-14 right-4 z-20 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs backdrop-blur-sm"
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground font-medium">
            <Activity className="h-3 w-3" />
            Connection Stats
          </div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-6">
              <span>Bitrate</span>
              <span className="text-foreground font-mono">{stats.bitrate} kbps</span>
            </div>
            <div className="flex justify-between gap-6">
              <span>Latency</span>
              <span className="text-foreground font-mono">{stats.roundTripTime} ms</span>
            </div>
            <div className="flex justify-between gap-6">
              <span>Packet loss</span>
              <span className="text-foreground font-mono">{stats.packetLoss}%</span>
            </div>
            <div className="flex justify-between gap-6">
              <span>Resolution</span>
              <span className="text-foreground font-mono">{stats.resolution}</span>
            </div>
            {qualityLevel && (
              <div className="flex justify-between gap-6 border-t border-border pt-1 mt-1">
                <span>Quality</span>
                <span className="text-foreground font-mono capitalize">{qualityLevel}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
