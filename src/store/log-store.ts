// ──────────────────────────────────────────────
// LogLens — Zustand Store
// ──────────────────────────────────────────────

import { create } from "zustand";
import {
  LogEntry,
  SignatureGroup,
  FormatPreset,
  DetectionResult,
  LogLevel,
  ViewMode,
  LOG_LEVEL_SEVERITY,
} from "@/types";
import { normalizeToSignature } from "@/lib/signature";

interface LogState {
  // ── File ────────────────────────────
  fileName: string | null;
  fileSize: number;

  // ── Parsing ─────────────────────────
  isLoading: boolean;
  parseProgress: number;
  entriesParsed: number;

  // ── Format Detection ────────────────
  detectedFormat: FormatPreset | null;
  confidence: number;
  detectionResults: DetectionResult[];

  // ── Entries ─────────────────────────
  entries: LogEntry[];
  groups: SignatureGroup[];

  // ── Filters ─────────────────────────
  activeLevels: Set<LogLevel>;
  searchText: string;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;

  // ── View ────────────────────────────
  viewMode: ViewMode;
  selectedEntryId: number | null;
  selectedGroupSig: string | null;

  // ── Custom Presets ──────────────────
  customPresets: FormatPreset[];

  // ── Actions ─────────────────────────
  setFile: (name: string, size: number) => void;
  setLoading: (loading: boolean) => void;
  setParseProgress: (progress: number, count: number) => void;
  setFormat: (preset: FormatPreset, confidence: number) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  addEntries: (newEntries: LogEntry[]) => void;
  finalizeGroups: () => void;
  setActiveLevels: (levels: Set<LogLevel>) => void;
  toggleLevel: (level: LogLevel) => void;
  setSearchText: (text: string) => void;
  setTimeRange: (start: string | null, end: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  selectEntry: (id: number | null) => void;
  selectGroup: (sig: string | null) => void;
  saveCustomPreset: (preset: FormatPreset) => void;
  reset: () => void;

  // ── Derived (computed on call) ──────
  filteredEntries: () => LogEntry[];
  filteredGroups: () => SignatureGroup[];
  summary: () => {
    totalEntries: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    fatalCount: number;
    timeRangeStart: string | null;
    timeRangeEnd: string | null;
    topGroups: SignatureGroup[];
  };
}

const ALL_LEVELS: Set<LogLevel> = new Set([
  "fatal",
  "error",
  "warning",
  "info",
  "debug",
  "trace",
  "unknown",
]);

// Load custom presets from localStorage
function loadCustomPresets(): FormatPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("loglens-custom-presets");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export const useLogStore = create<LogState>((set, get) => ({
  // ── Initial state ───────────────────
  fileName: null,
  fileSize: 0,
  isLoading: false,
  parseProgress: 0,
  entriesParsed: 0,
  detectedFormat: null,
  confidence: 0,
  detectionResults: [],
  entries: [],
  groups: [],
  activeLevels: new Set(ALL_LEVELS),
  searchText: "",
  timeRangeStart: null,
  timeRangeEnd: null,
  viewMode: "grouped",
  selectedEntryId: null,
  selectedGroupSig: null,
  customPresets: loadCustomPresets(),

  // ── Actions ─────────────────────────
  setFile: (name, size) => set({ fileName: name, fileSize: size }),

  setLoading: (loading) => set({ isLoading: loading }),

  setParseProgress: (progress, count) =>
    set({ parseProgress: progress, entriesParsed: count }),

  setFormat: (preset, confidence) =>
    set({ detectedFormat: preset, confidence }),

  setDetectionResults: (results) => set({ detectionResults: results }),

  addEntries: (newEntries) =>
    set((state) => ({
      entries: [...state.entries, ...newEntries],
      entriesParsed: state.entries.length + newEntries.length,
    })),

  finalizeGroups: () => {
    const entries = get().entries;
    // Build groups
    const groupMap = new Map<string, SignatureGroup>();
    for (const entry of entries) {
      const sig = normalizeToSignature(entry.message);
      let group = groupMap.get(sig);
      if (!group) {
        group = {
          signature: sig,
          displayMessage: entry.message,
          count: 0,
          level: entry.level,
          entries: [],
        };
        groupMap.set(sig, group);
      }
      group.count++;
      group.entries.push(entry);
      if (entry.timestamp) {
        if (!group.firstSeen || entry.timestamp < group.firstSeen)
          group.firstSeen = entry.timestamp;
        if (!group.lastSeen || entry.timestamp > group.lastSeen)
          group.lastSeen = entry.timestamp;
      }
      if (LOG_LEVEL_SEVERITY[entry.level] < LOG_LEVEL_SEVERITY[group.level]) {
        group.level = entry.level;
      }
    }
    const groups = Array.from(groupMap.values()).sort(
      (a, b) => b.count - a.count
    );

    // Compute time range
    let earliest: string | null = null;
    let latest: string | null = null;
    for (const entry of entries) {
      if (entry.timestamp) {
        if (!earliest || entry.timestamp < earliest) earliest = entry.timestamp;
        if (!latest || entry.timestamp > latest) latest = entry.timestamp;
      }
    }

    set({ groups, timeRangeStart: earliest, timeRangeEnd: latest });
  },

  setActiveLevels: (levels) => set({ activeLevels: levels }),

  toggleLevel: (level) => {
    const current = new Set(get().activeLevels);
    if (current.has(level)) {
      current.delete(level);
    } else {
      current.add(level);
    }
    set({ activeLevels: current });
  },

  setSearchText: (text) => set({ searchText: text }),

  setTimeRange: (start, end) =>
    set({ timeRangeStart: start, timeRangeEnd: end }),

  setViewMode: (mode) => set({ viewMode: mode }),

  selectEntry: (id) => set({ selectedEntryId: id }),

  selectGroup: (sig) => set({ selectedGroupSig: sig }),

  saveCustomPreset: (preset) => {
    const updated = [...get().customPresets.filter((p) => p.id !== preset.id), preset];
    set({ customPresets: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("loglens-custom-presets", JSON.stringify(updated));
    }
  },

  reset: () =>
    set({
      fileName: null,
      fileSize: 0,
      isLoading: false,
      parseProgress: 0,
      entriesParsed: 0,
      detectedFormat: null,
      confidence: 0,
      detectionResults: [],
      entries: [],
      groups: [],
      activeLevels: new Set(ALL_LEVELS),
      searchText: "",
      timeRangeStart: null,
      timeRangeEnd: null,
      selectedEntryId: null,
      selectedGroupSig: null,
    }),

  // ── Derived ─────────────────────────
  filteredEntries: () => {
    const { entries, activeLevels, searchText } = get();
    const lowerSearch = searchText.toLowerCase();
    return entries.filter((e) => {
      if (!activeLevels.has(e.level)) return false;
      if (lowerSearch && !e.raw.toLowerCase().includes(lowerSearch))
        return false;
      return true;
    });
  },

  filteredGroups: () => {
    const { groups, activeLevels, searchText } = get();
    const lowerSearch = searchText.toLowerCase();
    return groups.filter((g) => {
      if (!activeLevels.has(g.level)) return false;
      if (lowerSearch) {
        const matchesMsg = g.displayMessage.toLowerCase().includes(lowerSearch);
        const matchesSig = g.signature.toLowerCase().includes(lowerSearch);
        const matchesRaw = g.entries.some((e) =>
          e.raw.toLowerCase().includes(lowerSearch)
        );
        if (!matchesMsg && !matchesSig && !matchesRaw) return false;
      }
      return true;
    });
  },

  summary: () => {
    const { entries, groups, timeRangeStart, timeRangeEnd } = get();
    return {
      totalEntries: entries.length,
      errorCount: entries.filter((e) => e.level === "error").length,
      warningCount: entries.filter((e) => e.level === "warning").length,
      infoCount: entries.filter((e) => e.level === "info").length,
      fatalCount: entries.filter((e) => e.level === "fatal").length,
      timeRangeStart,
      timeRangeEnd,
      topGroups: groups.slice(0, 5),
    };
  },
}));
