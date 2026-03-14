"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Copy, Check } from "lucide-react";

interface CopyLinkButtonProps {
  roomId: string;
}

export function CopyLinkButton({ roomId }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={copy}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          />
        }
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {copied ? "Copied!" : "Copy room link"}
      </TooltipContent>
    </Tooltip>
  );
}
