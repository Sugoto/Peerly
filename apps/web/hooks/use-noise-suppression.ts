"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useNoiseSuppression() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const gateGainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const originalTrackRef = useRef<MediaStreamTrack | null>(null);

  const activate = useCallback(
    (
      stream: MediaStream,
      replaceTrack: (track: MediaStreamTrack) => void
    ) => {
      if (ctxRef.current) return;

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;
      originalTrackRef.current = audioTrack;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(
        new MediaStream([audioTrack])
      );
      sourceRef.current = source;

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;
      highpass.Q.value = 0.7;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 14000;
      lowpass.Q.value = 0.7;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -35;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;

      const gateGain = ctx.createGain();
      gateGain.gain.value = 1;
      gateGainRef.current = gateGain;

      const destination = ctx.createMediaStreamDestination();
      destinationRef.current = destination;

      source
        .connect(highpass)
        .connect(lowpass)
        .connect(analyser)
        .connect(compressor)
        .connect(gateGain)
        .connect(destination);

      const dataArray = new Float32Array(analyser.fftSize);
      const GATE_THRESHOLD = -50;

      const runGate = () => {
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const db = 20 * Math.log10(Math.max(rms, 1e-10));

        const target = db > GATE_THRESHOLD ? 1 : 0;
        const rate = target > gateGain.gain.value ? 0.01 : 0.05;
        gateGain.gain.setTargetAtTime(target, ctx.currentTime, rate);

        animFrameRef.current = requestAnimationFrame(runGate);
      };
      runGate();

      const processedTrack = destination.stream.getAudioTracks()[0];
      stream.removeTrack(audioTrack);
      stream.addTrack(processedTrack);
      replaceTrack(processedTrack);

      setEnabled(true);
    },
    []
  );

  const deactivate = useCallback(
    (
      stream: MediaStream,
      replaceTrack: (track: MediaStreamTrack) => void
    ) => {
      cancelAnimationFrame(animFrameRef.current);
      sourceRef.current?.disconnect();

      const processedTrack = stream.getAudioTracks()[0];
      const original = originalTrackRef.current;

      if (processedTrack && original) {
        stream.removeTrack(processedTrack);
        stream.addTrack(original);
        replaceTrack(original);
      }

      ctxRef.current?.close();
      ctxRef.current = null;
      sourceRef.current = null;
      destinationRef.current = null;
      gateGainRef.current = null;
      originalTrackRef.current = null;

      setEnabled(false);
    },
    []
  );

  const toggle = useCallback(
    (
      stream: MediaStream | null,
      replaceTrack: (track: MediaStreamTrack) => void
    ) => {
      if (!stream) return;
      if (enabled) {
        deactivate(stream, replaceTrack);
      } else {
        activate(stream, replaceTrack);
      }
    },
    [enabled, activate, deactivate]
  );

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      sourceRef.current?.disconnect();
      ctxRef.current?.close();
    };
  }, []);

  return { enabled, toggle };
}
