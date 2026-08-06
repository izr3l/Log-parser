"use client";

import React from "react";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  Hash,
  Skull,
  TrendingUp,
} from "lucide-react";
import { useLogStore } from "@/store/log-store";
import { cn } from "@/lib/utils";
import { LOG_LEVEL_COLORS, type LogLevel } from "@/types";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-4 group hover:border-[var(--border-hover)] transition-all duration-300">
      {/* Subtle gradient glow */}
      <div
        className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
        style={{
          background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p
          className="text-2xl font-heading font-bold tabular-nums"
          style={{ color }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function TopIssueRow({
  rank,
  message,
  count,
  level,
  onClick,
}: {
  rank: number;
  message: string;
  count: number;
  level: LogLevel;
  onClick: () => void;
}) {
  const color = LOG_LEVEL_COLORS[level];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left group"
    >
      <span className="text-xs font-mono text-[var(--text-muted)] w-5 text-right">
        {rank}.
      </span>
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-sm text-[var(--text-secondary)] truncate font-mono group-hover:text-[var(--text-primary)] transition-colors">
        {message}
      </span>
      <span
        className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md"
        style={{ backgroundColor: `${color}15`, color }}
      >
        ×{count}
      </span>
    </button>
  );
}

export default function SummaryPanel() {
  const entries = useLogStore((s) => s.entries);
  const isLoading = useLogStore((s) => s.isLoading);
  const selectGroup = useLogStore((s) => s.selectGroup);
  const summaryFn = useLogStore((s) => s.summary);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (entries.length === 0 || isLoading) return null;

  const summary = summaryFn();

  if (isCollapsed) {
    return (
      <div className="px-5 py-1.5 animate-in-fade">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3 font-mono">
            <span>
              Total: <strong className="text-[var(--text-primary)]">{summary.totalEntries.toLocaleString()}</strong>
            </span>
            {summary.fatalCount > 0 && (
              <span className="text-[var(--fatal)]">
                Fatal: <strong>{summary.fatalCount}</strong>
              </span>
            )}
            {summary.errorCount > 0 && (
              <span className="text-[var(--error)]">
                Errors: <strong>{summary.errorCount}</strong>
              </span>
            )}
            {summary.warningCount > 0 && (
              <span className="text-[var(--warning)]">
                Warnings: <strong>{summary.warningCount}</strong>
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline font-sans"
          >
            Show full summary ↑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-2.5 space-y-2.5 animate-in-fade">
      {/* Header bar with Collapse button */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span className="font-semibold uppercase tracking-wider text-[11px]">Overview & Statistics</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Collapse summary ↓
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatCard
          label="Total Entries"
          value={summary.totalEntries}
          icon={Hash}
          color="#8b5cf6"
        />
        <StatCard
          label="Fatal"
          value={summary.fatalCount}
          icon={Skull}
          color={LOG_LEVEL_COLORS.fatal}
        />
        <StatCard
          label="Errors"
          value={summary.errorCount}
          icon={AlertOctagon}
          color={LOG_LEVEL_COLORS.error}
        />
        <StatCard
          label="Warnings"
          value={summary.warningCount}
          icon={AlertTriangle}
          color={LOG_LEVEL_COLORS.warning}
        />
        <StatCard
          label="Info"
          value={summary.infoCount}
          icon={Info}
          color={LOG_LEVEL_COLORS.info}
        />
      </div>

      {/* Time range */}
      {summary.timeRangeStart && summary.timeRangeEnd && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Time range:{" "}
            <span className="text-[var(--text-secondary)] font-mono">
              {summary.timeRangeStart}
            </span>{" "}
            →{" "}
            <span className="text-[var(--text-secondary)] font-mono">
              {summary.timeRangeEnd}
            </span>
          </span>
        </div>
      )}

      {/* Top issues */}
      {summary.topGroups.length > 0 && (
        <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Most Frequent Issues
            </h3>
          </div>
          <div className="p-1">
            {summary.topGroups.map((group, i) => (
              <TopIssueRow
                key={group.signature}
                rank={i + 1}
                message={group.displayMessage}
                count={group.count}
                level={group.level}
                onClick={() => selectGroup(group.signature)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
