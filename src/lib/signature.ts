// ──────────────────────────────────────────────
// LogLens — Signature Normalisation
// ──────────────────────────────────────────────
//
// Strips variable content from a log message so that repeated
// occurrences of the same underlying issue collapse into one group.

/**
 * Normalise a message to a stable "signature" by replacing variable tokens
 * (timestamps, UUIDs, numbers, IPs, file paths with line numbers) with
 * fixed placeholders.
 */
export function normalizeToSignature(message: string): string {
  let sig = message;

  // ── ISO timestamps / date-times ───────────────
  sig = sig.replace(
    /\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,
    "<TIMESTAMP>"
  );

  // ── Syslog-style timestamps (Mon DD HH:MM:SS) ─
  sig = sig.replace(
    /[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/g,
    "<TIMESTAMP>"
  );

  // ── UUIDs ─────────────────────────────────────
  sig = sig.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "<UUID>"
  );

  // ── IPv6 addresses ────────────────────────────
  sig = sig.replace(
    /(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}/gi,
    "<IP>"
  );

  // ── IPv4 addresses ────────────────────────────
  sig = sig.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b/g,
    "<IP>"
  );

  // ── File paths with line numbers ──────────────
  sig = sig.replace(
    /(?:\/[\w.-]+)+(?::\d+(?::\d+)?)/g,
    "<FILE>"
  );
  // Windows paths
  sig = sig.replace(
    /[A-Z]:\\(?:[\w.-]+\\)*[\w.-]+(?::\d+)?/gi,
    "<FILE>"
  );

  // ── Hex addresses / pointers ──────────────────
  sig = sig.replace(/0x[0-9a-f]+/gi, "<HEX>");

  // ── Standalone numbers (but keep single digits) ─
  sig = sig.replace(/\b\d{2,}\b/g, "<NUM>");

  // ── Collapse repeated whitespace ──────────────
  sig = sig.replace(/\s+/g, " ").trim();

  return sig;
}
