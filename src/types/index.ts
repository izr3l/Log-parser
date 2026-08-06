// ──────────────────────────────────────────────
// LogLens — Core Type Definitions
// ──────────────────────────────────────────────

export type LogLevel =
  | "error"
  | "warning"
  | "info"
  | "debug"
  | "trace"
  | "fatal"
  | "unknown";

export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  debug: 4,
  trace: 5,
  unknown: 6,
};

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  fatal: "#dc2626",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  debug: "#8b5cf6",
  trace: "#6b7280",
  unknown: "#9ca3af",
};

/** A single parsed log entry (may span multiple lines). */
export interface LogEntry {
  /** Monotonically increasing ID. */
  id: number;
  /** Full raw text including continuation lines. */
  raw: string;
  /** Parsed timestamp (ISO string for serialisation across worker boundary). */
  timestamp?: string;
  /** Parsed severity level. */
  level: LogLevel;
  /** Primary message (first line, post-format extraction). */
  message: string;
  /** Format-specific extra fields (host, pid, IP, etc.). */
  extras: Record<string, string>;
  /** Additional lines folded into this entry (stack traces, etc.). */
  continuationLines: string[];
  /** 1-based line number in the original file. */
  lineNumber: number;
}

/** A group of entries sharing the same normalised "signature". */
export interface SignatureGroup {
  /** Stable identifier — the normalised message pattern. */
  signature: string;
  /** Human-readable representative message. */
  displayMessage: string;
  /** Number of individual occurrences. */
  count: number;
  /** ISO timestamp of first occurrence. */
  firstSeen?: string;
  /** ISO timestamp of last occurrence. */
  lastSeen?: string;
  /** Highest severity seen in this group. */
  level: LogLevel;
  /** All matching entries. */
  entries: LogEntry[];
}

/**
 * Defines a log format preset — either built-in or user-created.
 *
 * `pattern` is a string so it can cross the Worker boundary; it will be
 * compiled to a RegExp on the worker side.
 */
export interface FormatPreset {
  id: string;
  name: string;
  /** Regex source string (not a RegExp object — must be serialisable). */
  pattern: string;
  /** Regex flags (e.g. "i", "gi"). */
  flags: string;
  /** Named capture groups expected in the regex. */
  captureGroups: string[];
  /** How to detect continuation lines (regex source, or null). */
  continuationPattern?: string;
  /** If true, this preset was saved by the user. */
  isCustom?: boolean;
  /** For JSON logs: field mapping. */
  jsonFieldMap?: {
    level?: string;
    message?: string;
    timestamp?: string;
  };
}

/** Result of running format detection against a sample. */
export interface DetectionResult {
  preset: FormatPreset;
  /** 0–1 confidence score. */
  confidence: number;
  /** Number of sample lines that matched. */
  sampleMatches: number;
  /** Total lines sampled. */
  sampleTotal: number;
}

/** Filters applied by the user in the UI. */
export interface LogFilters {
  levels: Set<LogLevel>;
  searchText: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
}

/** View mode toggle. */
export type ViewMode = "grouped" | "flat";

/** Message types sent from the worker back to the main thread. */
export type WorkerMessage =
  | { type: "format-detected"; results: DetectionResult[] }
  | { type: "parse-progress"; progress: number; entriesSoFar: number }
  | { type: "entries-batch"; entries: LogEntry[] }
  | { type: "parse-complete"; totalEntries: number }
  | { type: "error"; message: string };
