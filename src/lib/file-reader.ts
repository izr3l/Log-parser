// ──────────────────────────────────────────────
// LogLens — Streamed File Reader
// ──────────────────────────────────────────────
//
// Reads a File in chunks via the Streams API, handling partial
// lines across chunk boundaries. Designed to keep memory usage
// constant regardless of file size.

export interface FileReaderCallbacks {
  /** Called with each complete text chunk + normalised 0-1 progress. */
  onChunk: (lines: string[], progress: number) => void;
  /** Called once when the stream finishes. */
  onComplete: () => void;
  /** Called if an error occurs. */
  onError: (error: Error) => void;
}

/**
 * Stream-read a File, splitting into lines and calling back with
 * batches of complete lines.  Handles chunk boundaries that split
 * a line mid-way.
 */
export async function streamFile(
  file: File,
  callbacks: FileReaderCallbacks
): Promise<void> {
  const totalBytes = file.size;
  let bytesRead = 0;
  let partialLine = "";

  try {
    const stream = file.stream();
    const reader = stream
      .pipeThrough(new TextDecoderStream())
      .getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += new Blob([value]).size;

      // Prepend any leftover from previous chunk
      const text = partialLine + value;
      const lines = text.split(/\r?\n/);

      // Last element may be incomplete — carry it forward
      partialLine = lines.pop() ?? "";

      if (lines.length > 0) {
        callbacks.onChunk(lines, bytesRead / totalBytes);
      }
    }

    // Flush any remaining partial line
    if (partialLine.length > 0) {
      callbacks.onChunk([partialLine], 1);
    }

    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Read just the first N lines of a file (for format detection sampling).
 */
export async function sampleLines(
  file: File,
  maxLines: number = 500
): Promise<string[]> {
  const result: string[] = [];
  let partialLine = "";

  const stream = file.stream();
  const reader = stream
    .pipeThrough(new TextDecoderStream())
    .getReader();

  while (result.length < maxLines) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = partialLine + value;
    const lines = text.split(/\r?\n/);
    partialLine = lines.pop() ?? "";

    for (const line of lines) {
      if (result.length >= maxLines) break;
      result.push(line);
    }
  }

  // Flush partial
  if (partialLine.length > 0 && result.length < maxLines) {
    result.push(partialLine);
  }

  // Cancel the reader since we don't need the rest
  reader.cancel();

  return result;
}

/**
 * Format bytes to a human-readable string (e.g. "1.23 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
