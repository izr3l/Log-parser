"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Search, X, List, Layers } from "lucide-react";
import { useLogStore } from "@/store/log-store";
import { cn } from "@/lib/utils";
import { LOG_LEVEL_COLORS, type LogLevel, type ViewMode } from "@/types";

const ALL_LEVEL_LIST: LogLevel[] = [
  "fatal",
  "error",
  "warning",
  "info",
  "debug",
  "trace",
  "unknown",
];

const LEVEL_OPTIONS: { level: LogLevel; label: string }[] = [
  { level: "fatal", label: "Fatal" },
  { level: "error", label: "Error" },
  { level: "warning", label: "Warn" },
  { level: "info", label: "Info" },
  { level: "debug", label: "Debug" },
  { level: "trace", label: "Trace" },
  { level: "unknown", label: "Other" },
];

export default function FilterBar() {
  const activeLevels = useLogStore((s) => s.activeLevels);
  const toggleLevel = useLogStore((s) => s.toggleLevel);
  const setActiveLevels = useLogStore((s) => s.setActiveLevels);
  const setSearchText = useLogStore((s) => s.setSearchText);
  const searchText = useLogStore((s) => s.searchText);
  const viewMode = useLogStore((s) => s.viewMode);
  const setViewMode = useLogStore((s) => s.setViewMode);
  const entries = useLogStore((s) => s.entries);
  const isLoading = useLogStore((s) => s.isLoading);

  const [localSearch, setLocalSearch] = useState(searchText);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchText(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchText]);

  const clearSearch = useCallback(() => {
    setLocalSearch("");
    setSearchText("");
  }, [setSearchText]);

  const isAllSelected = ALL_LEVEL_LIST.every((l) => activeLevels.has(l));

  const handleLevelClick = useCallback(
    (level: LogLevel) => {
      if (isAllSelected) {
        // Isolate this single level
        setActiveLevels(new Set([level]));
      } else if (activeLevels.size === 1 && activeLevels.has(level)) {
        // Toggle back to All
        setActiveLevels(new Set(ALL_LEVEL_LIST));
      } else {
        toggleLevel(level);
      }
    },
    [isAllSelected, activeLevels, setActiveLevels, toggleLevel]
  );

  const handleSelectAll = useCallback(() => {
    setActiveLevels(new Set(ALL_LEVEL_LIST));
  }, [setActiveLevels]);

  if (entries.length === 0 || isLoading) return null;

  return (
    <div className="px-5 py-2.5 flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)]/40 backdrop-blur-sm animate-in-fade">
      {/* Level toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* All button */}
        <button
          onClick={handleSelectAll}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-200",
            isAllSelected
              ? "bg-[var(--accent)] text-white border-transparent shadow-sm"
              : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] opacity-60"
          )}
        >
          All
        </button>

        {LEVEL_OPTIONS.map(({ level, label }) => {
          const active = activeLevels.has(level);
          const color = LOG_LEVEL_COLORS[level];
          return (
            <button
              key={level}
              onClick={() => handleLevelClick(level)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-200",
                active && !isAllSelected
                  ? "border-transparent font-semibold shadow-sm"
                  : active && isAllSelected
                  ? "border-transparent opacity-80"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] opacity-40 hover:opacity-70"
              )}
              style={
                active
                  ? { backgroundColor: `${color}25`, color, borderColor: `${color}50` }
                  : {}
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px] max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search messages…"
          className="w-full h-8 pl-9 pr-8 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
        />
        {localSearch && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center bg-[var(--surface-2)] rounded-lg border border-[var(--border)] p-0.5">
        {(["grouped", "flat"] as ViewMode[]).map((mode) => {
          const Icon = mode === "grouped" ? Layers : List;
          const label = mode === "grouped" ? "Grouped" : "Flat";
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                viewMode === mode
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
