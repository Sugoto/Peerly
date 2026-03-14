const ALGO = "AES-GCM";
const IV_LENGTH = 12;

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKey(encoded: string): Promise<CryptoKey> {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  remotePublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePublicKey },
    privateKey,
    { name: ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function computeVerificationCode(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function encryptFrame(
  key: CryptoKey,
  frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new Uint8Array(frame.data);
  const headerLen = getHeaderLen(frame);
  const header = data.subarray(0, headerLen);
  const payload = data.subarray(headerLen);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    payload
  );

  const result = new Uint8Array(headerLen + iv.length + encrypted.byteLength);
  result.set(header);
  result.set(iv, headerLen);
  result.set(new Uint8Array(encrypted), headerLen + iv.length);
  frame.data = result.buffer;
}

export async function decryptFrame(
  key: CryptoKey,
  frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame
): Promise<void> {
  const data = new Uint8Array(frame.data);
  const headerLen = getHeaderLen(frame);
  const header = data.subarray(0, headerLen);
  const iv = data.subarray(headerLen, headerLen + IV_LENGTH);
  const encrypted = data.subarray(headerLen + IV_LENGTH);

  if (encrypted.length === 0) return;

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      encrypted
    );
    const result = new Uint8Array(headerLen + decrypted.byteLength);
    result.set(header);
    result.set(new Uint8Array(decrypted), headerLen);
    frame.data = result.buffer;
  } catch {}
}

function getHeaderLen(frame: RTCEncodedVideoFrame | RTCEncodedAudioFrame): number {
  if ("type" in frame && (frame as RTCEncodedVideoFrame).type === "key") return 10;
  if ("type" in frame && (frame as RTCEncodedVideoFrame).type === "delta") return 3;
  return 1;
}

export function isEncodedTransformSupported(): boolean {
  return (
    typeof RTCRtpSender !== "undefined" &&
    "transform" in RTCRtpSender.prototype
  );
}

export function applyE2EE(
  pc: RTCPeerConnection,
  key: CryptoKey
): () => void {
  const abortController = new AbortController();

  const applySender = (sender: RTCRtpSender) => {
    if (!sender.track) return;
    try {
      const streams = (sender as any).createEncodedStreams?.();
      if (streams) {
        const transform = new TransformStream({
          async transform(frame, controller) {
            if (abortController.signal.aborted) { controller.enqueue(frame); return; }
            await encryptFrame(key, frame);
            controller.enqueue(frame);
          },
        });
        streams.readable.pipeThrough(transform).pipeTo(streams.writable);
      }
    } catch {}
  };

  const applyReceiver = (receiver: RTCRtpReceiver) => {
    try {
      const streams = (receiver as any).createEncodedStreams?.();
      if (streams) {
        const transform = new TransformStream({
          async transform(frame, controller) {
            if (abortController.signal.aborted) { controller.enqueue(frame); return; }
            await decryptFrame(key, frame);
            controller.enqueue(frame);
          },
        });
        streams.readable.pipeThrough(transform).pipeTo(streams.writable);
      }
    } catch {}
  };

  pc.getSenders().forEach(applySender);
  pc.getReceivers().forEach(applyReceiver);

  const onTrack = (event: RTCTrackEvent) => applyReceiver(event.receiver);
  pc.addEventListener("track", onTrack);

  return () => {
    abortController.abort();
    pc.removeEventListener("track", onTrack);
  };
}
