// ──────────────────────────────────────────────
// LogLens — Built-in Format Presets
// ──────────────────────────────────────────────

import { FormatPreset, DetectionResult, LogLevel } from "@/types";

/**
 * All built-in format presets.
 * Each uses a regex with named capture groups so the parser can
 * extract timestamp, level, message, and optional extras uniformly.
 */
export const BUILT_IN_PRESETS: FormatPreset[] = [
  // ── 1. Syslog ─────────────────────────────────
  {
    id: "syslog",
    name: "Syslog",
    // e.g. "Aug  6 14:32:01 myhost sshd[12345]: Accepted publickey …"
    pattern:
      "^(?<timestamp>[A-Z][a-z]{2}\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2})\\s+(?<host>\\S+)\\s+(?<process>[^\\[\\s]+)(?:\\[(?<pid>\\d+)\\])?:\\s+(?<message>.+)$",
    flags: "",
    captureGroups: ["timestamp", "host", "process", "pid", "message"],
    continuationPattern: "^\\s",
  },

  // ── 2. JSON-per-line ───────────────────────────
  {
    id: "json",
    name: "JSON Logs",
    // Matches any line that starts with `{` and ends with `}`
    pattern: "^\\{.*\\}\\s*$",
    flags: "",
    captureGroups: ["timestamp", "level", "message"],
    jsonFieldMap: {
      level: "level",
      message: "msg,message",
      timestamp: "ts,timestamp,time,@timestamp",
    },
  },

  // ── 3. Apache / Nginx Access Log ───────────────
  {
    id: "web-access",
    name: "Web Server Access Log",
    // Combined Log Format:
    // 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
    pattern:
      '^(?<ip>\\S+)\\s+\\S+\\s+(?<user>\\S+)\\s+\\[(?<timestamp>[^\\]]+)\\]\\s+"(?<method>\\S+)\\s+(?<path>\\S+)\\s+\\S+"\\s+(?<status>\\d{3})\\s+(?<size>\\S+)(?:\\s+"(?<referer>[^"]*)"\\s+"(?<useragent>[^"]*)")?',
    flags: "",
    captureGroups: ["ip", "user", "timestamp", "method", "path", "status", "size"],
    continuationPattern: undefined,
  },

  // ── 4. Apache / Nginx Error Log ────────────────
  {
    id: "web-error",
    name: "Web Server Error Log",
    // [Wed Oct 11 14:32:52.123456 2023] [error] [pid 1234] [client 10.0.0.1:1234] message
    pattern:
      "^\\[(?<timestamp>[^\\]]+)\\]\\s+\\[(?:(?<module>\\w+):)?(?<level>\\w+)\\]\\s+(?:\\[pid\\s+(?<pid>\\d+)\\]\\s+)?(?:\\[client\\s+(?<client>[^\\]]+)\\]\\s+)?(?<message>.+)$",
    flags: "",
    captureGroups: ["timestamp", "module", "level", "pid", "client", "message"],
    continuationPattern: "^\\s",
  },

  // ── 5. Generic Timestamped ─────────────────────
  {
    id: "generic",
    name: "Generic Timestamped",
    // e.g. "2024-01-15 14:32:01.123 [ERROR] Something happened"
    //   or "[2024-01-15T14:32:01Z] ERROR: Something happened"
    //   or "2024-01-15T14:32:01.123Z ERROR Something happened"
    pattern:
      "^\\[?(?<timestamp>\\d{4}[-/]\\d{2}[-/]\\d{2}[T\\s]\\d{2}:\\d{2}:\\d{2}(?:[.,]\\d{1,6})?(?:Z|[+-]\\d{2}:?\\d{2})?)\\]?\\s+\\[?(?<level>TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL|SEVERE|NOTICE)\\]?[:\\s]+(?<message>.+)$",
    flags: "i",
    captureGroups: ["timestamp", "level", "message"],
    continuationPattern: "^\\s|^\\t|^Caused by:|^\\.\\.\\.|^\\s+at\\s",
  },

  // ── 6. Fallback (unknown) ──────────────────────
  {
    id: "fallback",
    name: "Plain Text (no format detected)",
    pattern: "^(?<message>.+)$",
    flags: "",
    captureGroups: ["message"],
  },
];

/**
 * Map level strings to our canonical LogLevel enum.
 */
export function normalizeLevel(raw?: string): LogLevel {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase().trim();
  if (lower === "fatal" || lower === "critical" || lower === "severe")
    return "fatal";
  if (lower === "error" || lower === "err") return "error";
  if (
    lower === "warning" ||
    lower === "warn" ||
    lower === "notice"
  )
    return "warning";
  if (lower === "info" || lower === "information") return "info";
  if (lower === "debug" || lower === "dbg") return "debug";
  if (lower === "trace" || lower === "verbose") return "trace";
  return "unknown";
}

/**
 * Infer a pseudo-level from HTTP status codes (for access logs).
 */
export function levelFromStatus(status?: string): LogLevel {
  if (!status) return "info";
  const code = parseInt(status, 10);
  if (code >= 500) return "error";
  if (code >= 400) return "warning";
  return "info";
}

/**
 * Run format detection: test each preset against the first N lines
 * and return scored results sorted by confidence (descending).
 */
export function detectFormat(
  sampleLines: string[],
  customPresets: FormatPreset[] = []
): DetectionResult[] {
  const allPresets = [...customPresets, ...BUILT_IN_PRESETS];
  const nonEmpty = sampleLines.filter((l) => l.trim().length > 0);
  const total = nonEmpty.length;
  if (total === 0) return [];

  const results: DetectionResult[] = [];

  for (const preset of allPresets) {
    // Skip fallback — it matches everything
    if (preset.id === "fallback") continue;

    let matches = 0;

    if (preset.id === "json") {
      // For JSON, try parsing each line
      for (const line of nonEmpty) {
        try {
          const trimmed = line.trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            JSON.parse(trimmed);
            matches++;
          }
        } catch {
          // not JSON
        }
      }
    } else {
      const re = new RegExp(preset.pattern, preset.flags);
      for (const line of nonEmpty) {
        if (re.test(line)) matches++;
      }
    }

    const confidence = matches / total;
    if (confidence > 0.1) {
      results.push({ preset, confidence, sampleMatches: matches, sampleTotal: total });
    }
  }

  // Sort highest confidence first
  results.sort((a, b) => b.confidence - a.confidence);

  // Always add fallback at the end
  const fallback = BUILT_IN_PRESETS.find((p) => p.id === "fallback")!;
  results.push({
    preset: fallback,
    confidence: 0,
    sampleMatches: 0,
    sampleTotal: total,
  });

  return results;
}
