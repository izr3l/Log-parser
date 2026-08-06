"use client";

import React from "react";
import { Info, Pencil } from "lucide-react";
import { useLogStore } from "@/store/log-store";

interface FormatBannerProps {
  onEditPattern: () => void;
}

export default function FormatBanner({ onEditPattern }: FormatBannerProps) {
  const detectedFormat = useLogStore((s) => s.detectedFormat);
  const confidence = useLogStore((s) => s.confidence);

  if (!detectedFormat) return null;

  const pct = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--surface-1)]/80 border-b border-[var(--border)] backdrop-blur-sm animate-in-slide-down">
      <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
      <p className="text-sm text-[var(--text-secondary)] flex-1">
        Detected format:{" "}
        <span className="font-semibold text-[var(--text-primary)]">
          {detectedFormat.name}
        </span>{" "}
        <span className="text-[var(--text-muted)]">
          ({pct}% confidence)
        </span>
        {pct < 80 && (
          <span className="text-[var(--warning)] ml-1">— not right?</span>
        )}
      </p>
      <button
        onClick={onEditPattern}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
      >
        <Pencil className="w-3 h-3" />
        Edit pattern
      </button>
    </div>
  );
}
