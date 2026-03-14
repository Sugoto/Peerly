"use client";

import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Video, Zap, Globe, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = nanoid(8);
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-chart-1/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex max-w-2xl flex-col items-center text-center"
      >
        <div className="mb-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Video className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">StreamLink</span>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-7xl">
          Peer-to-Peer{" "}
          <span className="bg-gradient-to-r from-chart-1 to-chart-3 bg-clip-text text-transparent">
            Video Chat
          </span>
        </h1>

        <p className="mb-8 max-w-md text-lg text-muted-foreground">
          Create a room, share the link, and connect with anyone in the world.
          No sign-ups. No downloads. Completely free.
        </p>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="lg"
            onClick={createRoom}
            className="h-14 cursor-pointer rounded-full px-10 text-lg font-semibold"
          >
            <Video className="mr-2 h-5 w-5" />
            Create Room
          </Button>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Instant",
              desc: "No downloads or sign-ups required",
            },
            {
              icon: Globe,
              title: "Global",
              desc: "Connect with anyone via a simple link",
            },
            {
              icon: Shield,
              title: "Private",
              desc: "Direct peer-to-peer encrypted streams",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm"
            >
              <Icon className="h-8 w-8 text-chart-1" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
