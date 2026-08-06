"use client";

import React, { useRef, useMemo, useCallback, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  ChevronDown,
  AlertOctagon,
  AlertTriangle,
  Info,
  Bug,
  Skull,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { useLogStore } from "@/store/log-store";
import { cn } from "@/lib/utils";
import { LOG_LEVEL_COLORS, type LogEntry, type LogLevel, type SignatureGroup } from "@/types";

// ── Level Icons ────────────────────────────────
const LEVEL_ICONS: Record<LogLevel, React.ElementType> = {
  fatal: Skull,
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
  debug: Bug,
  trace: FileText,
  unknown: FileText,
};

// ── Copy Button ────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      className="p-1 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      title="Copy raw text"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Single Entry Row ───────────────────────────
function EntryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = LOG_LEVEL_COLORS[entry.level];
  const Icon = LEVEL_ICONS[entry.level];
  const hasExtra = entry.continuationLines.length > 0;

  return (
    <div className="px-5 py-0.5">
      <div
        onClick={hasExtra ? onToggle : undefined}
        className={cn(
          "flex items-start gap-3 py-2 px-3 rounded-lg border transition-all duration-200",
          hasExtra ? "cursor-pointer hover:bg-[var(--surface-2)]" : "",
          isExpanded
            ? "bg-[var(--surface-2)] border-[var(--border-hover)]"
            : "border-transparent"
        )}
      >
        {/* Severity icon */}
        <div className="flex items-center gap-2 pt-0.5 shrink-0">
          {hasExtra && (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )}
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Timestamp */}
        {entry.timestamp && (
          <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 pt-0.5 min-w-[140px]">
            {entry.timestamp}
          </span>
        )}

        {/* Line number */}
        <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 pt-0.5 opacity-50">
          L{entry.lineNumber}
        </span>

        {/* Message */}
        <span className={cn(
          "flex-1 text-sm font-mono text-[var(--text-secondary)]",
          !isExpanded ? "truncate" : "whitespace-pre-wrap break-all"
        )}>
          {entry.message}
        </span>

        {/* Extras badges */}
        {Object.entries(entry.extras).slice(0, 2).map(([key, val]) => (
          <span
            key={key}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] shrink-0 hidden sm:inline"
          >
            {key}:{val}
          </span>
        ))}

        <CopyButton text={entry.raw} />
      </div>

      {/* Expanded: show full raw text */}
      {isExpanded && (
        <div className="ml-12 mb-2 mt-1 animate-in-slide-down">
          <pre className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-3)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-[var(--border)]">
            {entry.raw}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Group Row ──────────────────────────────────
function GroupRow({
  group,
  isExpanded,
  onToggle,
  expandedEntries,
  onToggleEntry,
}: {
  group: SignatureGroup;
  isExpanded: boolean;
  onToggle: () => void;
  expandedEntries: Set<number>;
  onToggleEntry: (id: number) => void;
}) {
  const color = LOG_LEVEL_COLORS[group.level];
  const Icon = LEVEL_ICONS[group.level];

  return (
    <div className="px-5 py-1">
      <div
        onClick={onToggle}
        className={cn(
          "flex items-start gap-3 py-3 px-4 rounded-xl border cursor-pointer transition-all duration-200",
          "hover:bg-[var(--surface-2)]",
          isExpanded
            ? "bg-[var(--surface-1)] border-[var(--border-hover)] shadow-sm"
            : "bg-[var(--surface-1)]/50 border-[var(--border)]"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
        )}

        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-[var(--text-primary)] truncate">
            {group.displayMessage}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {group.firstSeen && (
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                First: {group.firstSeen}
              </span>
            )}
            {group.lastSeen && group.lastSeen !== group.firstSeen && (
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Last: {group.lastSeen}
              </span>
            )}
          </div>
        </div>

        <span
          className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {group.count.toLocaleString()}×
        </span>
      </div>

      {/* Expanded: show individual entries */}
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-[var(--border)] pl-3 animate-in-slide-down">
          {group.entries.slice(0, 100).map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntries.has(entry.id)}
              onToggle={() => onToggleEntry(entry.id)}
            />
          ))}
          {group.entries.length > 100 && (
            <p className="text-xs text-[var(--text-muted)] py-2 pl-3">
              … and {(group.entries.length - 100).toLocaleString()} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Log List ──────────────────────────────
export default function LogList() {
  const entries = useLogStore((s) => s.entries);
  const groups = useLogStore((s) => s.groups);
  const activeLevels = useLogStore((s) => s.activeLevels);
  const searchText = useLogStore((s) => s.searchText);
  const isLoading = useLogStore((s) => s.isLoading);
  const viewMode = useLogStore((s) => s.viewMode);
  const filteredEntriesFn = useLogStore((s) => s.filteredEntries);
  const filteredGroupsFn = useLogStore((s) => s.filteredGroups);
  const selectEntry = useLogStore((s) => s.selectEntry);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredEntries = useMemo(
    () => filteredEntriesFn(),
    [filteredEntriesFn, entries, activeLevels, searchText]
  );
  const filteredGroups = useMemo(
    () => filteredGroupsFn(),
    [filteredGroupsFn, groups, activeLevels, searchText]
  );

  const toggleGroup = useCallback((sig: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sig)) next.delete(sig);
      else next.add(sig);
      return next;
    });
  }, []);

  const toggleEntry = useCallback((id: number) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Virtualizer for flat view ──────────────
  const flatVirtualizer = useVirtualizer({
    count: viewMode === "flat" ? filteredEntries.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  // ── Virtualizer for grouped view ───────────
  const groupVirtualizer = useVirtualizer({
    count: viewMode === "grouped" ? filteredGroups.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  if (entries.length === 0 && !isLoading) return null;

  return (
    <div
      ref={parentRef}
      className="flex-1 w-full h-full overflow-y-auto min-h-0"
    >
      {viewMode === "flat" ? (
        /* ── Flat (virtualized with dynamic height measurement) ─────────── */
        <div
          style={{
            height: `${flatVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {flatVirtualizer.getVirtualItems().map((virtualRow) => {
            const entry = filteredEntries[virtualRow.index];
            if (!entry) return null;
            return (
              <div
                key={virtualRow.key}
                ref={flatVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <EntryRow
                  entry={entry}
                  isExpanded={expandedEntries.has(entry.id)}
                  onToggle={() => toggleEntry(entry.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Grouped (virtualized with dynamic height measurement) ────────── */
        <div
          style={{
            height: `${groupVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {filteredGroups.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] text-center py-12">
              No matching entries found.
            </p>
          )}
          {groupVirtualizer.getVirtualItems().map((virtualRow) => {
            const group = filteredGroups[virtualRow.index];
            if (!group) return null;
            return (
              <div
                key={virtualRow.key}
                ref={groupVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <GroupRow
                  group={group}
                  isExpanded={expandedGroups.has(group.signature)}
                  onToggle={() => toggleGroup(group.signature)}
                  expandedEntries={expandedEntries}
                  onToggleEntry={toggleEntry}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
