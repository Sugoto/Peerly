"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewModal } from "@/components/preview-modal";
import {
  Video,
  Zap,
  Globe,
  Shield,
  Lock,
  ArrowRight,
  MonitorSmartphone,
  Users,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Home() {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleCreateRoom = () => {
    setRoomId(nanoid(8));
    setPreviewOpen(true);
  };

  const handleJoinExisting = () => {
    if (!joinRoomId.trim()) return;
    router.push(`/room/${joinRoomId.trim()}`);
  };

  const handleJoin = (settings: {
    roomId: string;
    displayName: string;
    audio: boolean;
    video: boolean;
  }) => {
    setPreviewOpen(false);
    const params = new URLSearchParams({
      audio: String(settings.audio),
      video: String(settings.video),
      name: settings.displayName,
    });
    router.push(`/room/${settings.roomId}?${params}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-chart-1/[0.07] blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-chart-3/[0.05] blur-[100px]" />
        <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-chart-5/[0.05] blur-[100px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <Video className="h-4 w-4 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Peerly
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Sugoto/P2PView"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </nav>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex max-w-3xl flex-col items-center text-center"
        >
          <motion.div variants={item}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                End-to-end encrypted, always free
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="mb-6 text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
          >
            Talk freely,
            <br />
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
              without the middleman.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mb-10 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            Encrypted video and audio calls that flow directly between
            browsers. No servers in the middle, no data collected, ever.
          </motion.p>

          <motion.div
            variants={item}
            className="flex w-full max-w-md flex-col items-center gap-3 sm:flex-row"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                onClick={handleCreateRoom}
                className="h-12 w-full cursor-pointer rounded-xl px-8 text-base font-semibold sm:w-auto"
              >
                Create Room
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <span className="text-sm text-muted-foreground">or</span>

            <div className="flex w-full gap-2 sm:w-auto">
              <Input
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="h-12 w-full rounded-xl bg-card/50 backdrop-blur-sm sm:w-44"
                onKeyDown={(e) => e.key === "Enter" && handleJoinExisting()}
              />
              <Button
                variant="secondary"
                size="lg"
                onClick={handleJoinExisting}
                disabled={!joinRoomId.trim()}
                className="h-12 cursor-pointer rounded-xl px-5"
              >
                Join
              </Button>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
          className="mt-24 w-full max-w-5xl px-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Instant Setup",
                desc: "No accounts, no downloads. Click and you're live in seconds.",
              },
              {
                icon: Lock,
                title: "Encrypted",
                desc: "DTLS + SRTP encryption on every stream. We never see or hear your calls.",
              },
              {
                icon: Globe,
                title: "Works Everywhere",
                desc: "Share a link. Anyone with a browser can join from anywhere.",
              },
              {
                icon: MonitorSmartphone,
                title: "Any Device",
                desc: "Desktop, tablet, or phone. Responsive across all screen sizes.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                className="group rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/60"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background transition-colors group-hover:border-foreground/20">
                  <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-20 w-full max-w-3xl px-4"
        >
          <div className="rounded-2xl border border-border/50 bg-card/20 p-8 backdrop-blur-sm md:p-12">
            <h2 className="mb-6 text-center text-2xl font-bold tracking-tight md:text-3xl">
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create",
                  desc: "Click the button. A unique room is generated instantly.",
                },
                {
                  step: "02",
                  title: "Share",
                  desc: "Copy the link and send it to whoever you want to talk to.",
                },
                {
                  step: "03",
                  title: "Connect",
                  desc: "They open the link. Audio and video stream directly, peer to peer.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center md:text-left">
                  <div className="mb-2 font-mono text-xs text-muted-foreground">
                    {step}
                  </div>
                  <h3 className="mb-1 text-base font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="mt-20 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" />
              <span>WebRTC</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              <span>Peer-to-Peer</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span>Zero-Knowledge</span>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border/40 px-6 py-6 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4" />
            <span>Peerly</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Sugoto Basu. Open source. No tracking. No data collection.
          </p>
        </div>
      </footer>

      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        roomId={roomId}
        roomIdEditable
        onJoin={handleJoin}
      />
    </div>
  );
}
