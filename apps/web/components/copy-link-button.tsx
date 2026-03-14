"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Link, Check } from "lucide-react";

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
            size="sm"
            onClick={copy}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          />
        }
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Link className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy link"}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {copied ? "Link copied!" : "Copy room link to clipboard"}
      </TooltipContent>
    </Tooltip>
  );
}
