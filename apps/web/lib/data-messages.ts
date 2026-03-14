export type DataMessage =
  | { type: "chat"; text: string; sender: string; timestamp: number }
  | { type: "file-meta"; fileId: string; name: string; size: number; mimeType: string; sender: string }
  | { type: "file-chunk"; fileId: string; chunk: string; index: number; total: number }
  | { type: "caption"; text: string; sender: string; isFinal: boolean };

export const FILE_CHUNK_SIZE = 16 * 1024;

export function encodeMessage(msg: DataMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(raw: string): DataMessage | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
