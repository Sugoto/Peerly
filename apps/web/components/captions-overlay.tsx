"use client";

import { motion } from "framer-motion";

interface Caption {
  sender: string;
  text: string;
  timestamp: number;
}

interface CaptionsOverlayProps {
  captions: Caption[];
}

export function CaptionsOverlay({ captions }: CaptionsOverlayProps) {
  if (captions.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none">
      {captions.map((caption) => (
        <motion.div
          key={caption.sender}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 rounded-lg bg-black/80 px-4 py-2 text-center text-sm text-white backdrop-blur-sm"
        >
          <span className="font-semibold text-white/60">{caption.sender}: </span>
          {caption.text}
        </motion.div>
      ))}
    </div>
  );
}
