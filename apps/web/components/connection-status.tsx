"use client";

import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  isConnected: boolean;
  peerCount: number;
}

export function ConnectionStatus({
  isConnected,
  peerCount,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? "default" : "destructive"} className="gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
        />
        {isConnected ? "Connected" : "Connecting..."}
      </Badge>
      <Badge variant="secondary">
        {peerCount} {peerCount === 1 ? "peer" : "peers"}
      </Badge>
    </div>
  );
}
