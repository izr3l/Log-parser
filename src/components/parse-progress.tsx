"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useLogStore } from "@/store/log-store";

export default function ParseProgress() {
  const isLoading = useLogStore((s) => s.isLoading);
  const progress = useLogStore((s) => s.parseProgress);
  const entriesParsed = useLogStore((s) => s.entriesParsed);

  if (!isLoading) return null;

  const pct = Math.round(progress * 100);

  return (
    <div className="px-5 py-3 bg-[var(--surface-1)]/60 border-b border-[var(--border)] animate-in-slide-down">
      <div className="flex items-center gap-3 mb-2">
        <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
        <span className="text-sm text-[var(--text-secondary)]">
          Parsing… {entriesParsed.toLocaleString()} entries found
        </span>
        <span className="text-sm font-mono text-[var(--text-muted)] ml-auto">
          {pct}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
