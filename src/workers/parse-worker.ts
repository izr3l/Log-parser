// ──────────────────────────────────────────────
// LogLens — Parse Worker
// ──────────────────────────────────────────────
//
// Runs in a dedicated Web Worker. Receives text lines from the
// main thread, parses them against the active format preset,
// groups multi-line entries, and posts back batched results.

import {
  LogEntry,
  LogLevel,
  FormatPreset,
  SignatureGroup,
  LOG_LEVEL_SEVERITY,
} from "@/types";
import { normalizeLevel, levelFromStatus } from "@/lib/format-presets";
import { normalizeToSignature } from "@/lib/signature";

let nextId = 0;
let globalLineNumber = 0;

/** Reset counters (call before starting a new file). */
export function resetCounters() {
  nextId = 0;
  globalLineNumber = 0;
}

/**
 * Parse a JSON log line using the preset's field mapping.
 */
function parseJsonLine(
  line: string,
  preset: FormatPreset,
  lineNum: number
): LogEntry | null {
  try {
    const obj = JSON.parse(line.trim());
    const fieldMap = preset.jsonFieldMap ?? {};

    // Resolve field: try comma-separated candidates
    const resolve = (candidates?: string): string | undefined => {
      if (!candidates) return undefined;
      for (const key of candidates.split(",")) {
        if (obj[key.trim()] !== undefined) return String(obj[key.trim()]);
      }
      return undefined;
    };

    const message = resolve(fieldMap.message) ?? JSON.stringify(obj);
    const level = normalizeLevel(resolve(fieldMap.level));
    const timestamp = resolve(fieldMap.timestamp);

    // Collect "extras" — everything that isn't level/message/timestamp
    const mappedKeys = new Set<string>();
    for (const candidates of Object.values(fieldMap)) {
      if (candidates) {
        for (const k of candidates.split(",")) mappedKeys.add(k.trim());
      }
    }
    const extras: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!mappedKeys.has(k)) extras[k] = String(v);
    }

    return {
      id: nextId++,
      raw: line,
      timestamp,
      level,
      message,
      extras,
      continuationLines: [],
      lineNumber: lineNum,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a single line using the preset's regex.
 */
function parseRegexLine(
  line: string,
  regex: RegExp,
  preset: FormatPreset,
  lineNum: number
): LogEntry | null {
  const match = regex.exec(line);
  if (!match?.groups) return null;

  const groups = match.groups;
  const message = groups["message"] ?? line;

  // Determine level
  let level: LogLevel;
  if (groups["level"]) {
    level = normalizeLevel(groups["level"]);
  } else if (groups["status"]) {
    level = levelFromStatus(groups["status"]);
  } else {
    level = "unknown";
  }

  // Collect extras
  const extras: Record<string, string> = {};
  const skipKeys = new Set(["timestamp", "level", "message"]);
  for (const [key, val] of Object.entries(groups)) {
    if (!skipKeys.has(key) && val !== undefined) {
      extras[key] = val;
    }
  }

  return {
    id: nextId++,
    raw: line,
    timestamp: groups["timestamp"],
    level,
    message,
    extras,
    continuationLines: [],
    lineNumber: lineNum,
  };
}

/**
 * Parse a batch of lines into LogEntry[].
 * Handles multi-line grouping: continuation lines are folded into
 * the preceding entry.
 *
 * Returns { entries, pendingEntry } — the pending entry may receive
 * more continuation lines from the next batch.
 */
export function parseLines(
  lines: string[],
  preset: FormatPreset,
  pendingEntry: LogEntry | null
): { entries: LogEntry[]; pendingEntry: LogEntry | null } {
  const entries: LogEntry[] = [];
  const isJson = preset.id === "json";
  const regex = isJson ? null : new RegExp(preset.pattern, preset.flags);
  const contRegex = preset.continuationPattern
    ? new RegExp(preset.continuationPattern)
    : null;

  for (const line of lines) {
    globalLineNumber++;

    // Skip empty lines
    if (line.trim().length === 0) {
      if (pendingEntry) {
        pendingEntry.continuationLines.push(line);
        pendingEntry.raw += "\n" + line;
      }
      continue;
    }

    // Check if this is a continuation line
    if (pendingEntry && contRegex && contRegex.test(line)) {
      pendingEntry.continuationLines.push(line);
      pendingEntry.raw += "\n" + line;
      continue;
    }

    // Try to parse as a new entry
    const entry = isJson
      ? parseJsonLine(line, preset, globalLineNumber)
      : parseRegexLine(line, regex!, preset, globalLineNumber);

    if (entry) {
      // Flush previous pending entry
      if (pendingEntry) {
        entries.push(pendingEntry);
      }
      pendingEntry = entry;
    } else {
      // Didn't match — treat as continuation of previous entry
      if (pendingEntry) {
        pendingEntry.continuationLines.push(line);
        pendingEntry.raw += "\n" + line;
      } else {
        // No previous entry — create a fallback entry
        entries.push({
          id: nextId++,
          raw: line,
          level: "unknown",
          message: line,
          extras: {},
          continuationLines: [],
          lineNumber: globalLineNumber,
        });
      }
    }
  }

  return { entries, pendingEntry };
}

/**
 * Build signature groups from a flat list of entries.
 */
export function buildSignatureGroups(entries: LogEntry[]): SignatureGroup[] {
  const groupMap = new Map<string, SignatureGroup>();

  for (const entry of entries) {
    const signature = normalizeToSignature(entry.message);

    let group = groupMap.get(signature);
    if (!group) {
      group = {
        signature,
        displayMessage: entry.message,
        count: 0,
        level: entry.level,
        entries: [],
      };
      groupMap.set(signature, group);
    }

    group.count++;
    group.entries.push(entry);

    // Track first/last seen
    if (entry.timestamp) {
      if (!group.firstSeen || entry.timestamp < group.firstSeen) {
        group.firstSeen = entry.timestamp;
      }
      if (!group.lastSeen || entry.timestamp > group.lastSeen) {
        group.lastSeen = entry.timestamp;
      }
    }

    // Elevate group severity to the highest seen
    if (LOG_LEVEL_SEVERITY[entry.level] < LOG_LEVEL_SEVERITY[group.level]) {
      group.level = entry.level;
    }
  }

  // Sort groups by count descending
  return Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
}
