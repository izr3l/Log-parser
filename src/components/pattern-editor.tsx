"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { X, Save, Play, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLogStore } from "@/store/log-store";
import { cn } from "@/lib/utils";
import type { FormatPreset } from "@/types";

interface PatternEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  sampleLines: string[];
}

export default function PatternEditor({
  isOpen,
  onClose,
  onApply,
  sampleLines,
}: PatternEditorProps) {
  const detectedFormat = useLogStore((s) => s.detectedFormat);
  const saveCustomPreset = useLogStore((s) => s.saveCustomPreset);
  const setFormat = useLogStore((s) => s.setFormat);

  const [pattern, setPattern] = useState(detectedFormat?.pattern ?? "");
  const [flags, setFlags] = useState(detectedFormat?.flags ?? "i");
  const [contPattern, setContPattern] = useState(
    detectedFormat?.continuationPattern ?? ""
  );
  const [presetName, setPresetName] = useState(
    detectedFormat?.isCustom ? detectedFormat.name : ""
  );
  const [regexError, setRegexError] = useState<string | null>(null);

  // Update state when detected format changes
  useEffect(() => {
    if (detectedFormat) {
      setPattern(detectedFormat.pattern);
      setFlags(detectedFormat.flags);
      setContPattern(detectedFormat.continuationPattern ?? "");
    }
  }, [detectedFormat]);

  // Live preview: try to parse sample lines with current pattern
  const preview = useMemo(() => {
    if (!pattern) return [];

    try {
      const re = new RegExp(pattern, flags);
      setRegexError(null);
      return sampleLines.slice(0, 10).map((line) => {
        const match = re.exec(line);
        return {
          line,
          matched: !!match,
          groups: match?.groups ?? {},
        };
      });
    } catch (err) {
      setRegexError(
        err instanceof Error ? err.message : "Invalid regex"
      );
      return sampleLines.slice(0, 10).map((line) => ({
        line,
        matched: false,
        groups: {},
      }));
    }
  }, [pattern, flags, sampleLines]);

  const matchRate = useMemo(() => {
    if (preview.length === 0) return 0;
    return preview.filter((p) => p.matched).length / preview.length;
  }, [preview]);

  const handleApply = useCallback(() => {
    if (regexError) return;

    // Extract capture group names from the regex
    const groups: string[] = [];
    const groupRe = /\(\?<(\w+)>/g;
    let m;
    while ((m = groupRe.exec(pattern)) !== null) {
      groups.push(m[1]);
    }

    const preset: FormatPreset = {
      id: presetName
        ? `custom-${presetName.toLowerCase().replace(/\s+/g, "-")}`
        : detectedFormat?.id ?? "custom",
      name: presetName || detectedFormat?.name || "Custom",
      pattern,
      flags,
      captureGroups: groups,
      continuationPattern: contPattern || undefined,
      isCustom: !!presetName,
    };

    setFormat(preset, matchRate);
    if (presetName) {
      saveCustomPreset(preset);
    }
    onApply();
  }, [
    pattern,
    flags,
    contPattern,
    presetName,
    regexError,
    matchRate,
    detectedFormat,
    setFormat,
    saveCustomPreset,
    onApply,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in-fade">
      <div className="w-full max-w-3xl max-h-[85vh] mx-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)]">
            Edit Pattern
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Regex pattern */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Regex Pattern (with named capture groups)
            </label>
            <textarea
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 text-sm font-mono rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 resize-none"
              placeholder="^(?<timestamp>\d{4}-\d{2}-\d{2})\s+\[(?<level>\w+)\]\s+(?<message>.+)$"
            />
            {regexError && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {regexError}
              </div>
            )}
          </div>

          {/* Flags + continuation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Regex Flags
              </label>
              <input
                type="text"
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                className="w-full px-4 py-2 text-sm font-mono rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                placeholder="i"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Continuation Pattern
              </label>
              <input
                type="text"
                value={contPattern}
                onChange={(e) => setContPattern(e.target.value)}
                className="w-full px-4 py-2 text-sm font-mono rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                placeholder="^\s"
              />
            </div>
          </div>

          {/* Save as preset */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Save as preset (optional)
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-4 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
              placeholder="My Custom Format"
            />
          </div>

          {/* Match rate */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
            {matchRate >= 0.7 ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-sm text-[var(--text-secondary)]">
              Match rate:{" "}
              <span
                className={cn(
                  "font-semibold",
                  matchRate >= 0.7 ? "text-green-400" : "text-amber-400"
                )}
              >
                {Math.round(matchRate * 100)}%
              </span>{" "}
              ({preview.filter((p) => p.matched).length}/{preview.length} sample
              lines)
            </span>
          </div>

          {/* Live preview */}
          <div>
            <h3 className="text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wider">
              Live Preview
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg bg-[var(--surface-3)] border border-[var(--border)] p-2">
              {preview.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-xs font-mono px-3 py-1.5 rounded-md",
                    p.matched
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-red-500/5 border border-red-500/10 opacity-60"
                  )}
                >
                  <div className="text-[var(--text-muted)] truncate">
                    {p.line}
                  </div>
                  {p.matched && Object.keys(p.groups).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(p.groups).map(([key, val]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-[10px]"
                        >
                          <span className="opacity-60">{key}:</span>
                          {String(val)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!!regexError}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              regexError
                ? "bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed"
                : "bg-[var(--accent)] hover:bg-[var(--accent-bright)] text-white shadow-lg shadow-[var(--accent)]/20"
            )}
          >
            <Play className="w-3.5 h-3.5" />
            Apply & Re-parse
          </button>
        </div>
      </div>
    </div>
  );
}
