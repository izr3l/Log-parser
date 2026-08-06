"use client";

import React, { useCallback, useState, useRef } from "react";
import { Eye } from "lucide-react";
import DropZone from "@/components/drop-zone";
import FormatBanner from "@/components/format-banner";
import ParseProgress from "@/components/parse-progress";
import SummaryPanel from "@/components/summary-panel";
import FilterBar from "@/components/filter-bar";
import LogList from "@/components/log-list";
import PatternEditor from "@/components/pattern-editor";
import { useLogStore } from "@/store/log-store";
import { sampleLines as readSampleLines, streamFile } from "@/lib/file-reader";
import { detectFormat } from "@/lib/format-presets";
import { parseLines, resetCounters } from "@/workers/parse-worker";

export default function HomePage() {
  const store = useLogStore();
  const [showPatternEditor, setShowPatternEditor] = useState(false);
  const [fileSampleLines, setFileSampleLines] = useState<string[]>([]);
  const currentFileRef = useRef<File | null>(null);

  const handleFileSelected = useCallback(
    async (file: File) => {
      // Reset previous state
      store.reset();
      resetCounters();
      currentFileRef.current = file;

      // Set file info
      store.setFile(file.name, file.size);
      store.setLoading(true);

      try {
        // ── Step 1: Sample lines for format detection ──
        const sample = await readSampleLines(file, 500);
        setFileSampleLines(sample);

        // ── Step 2: Detect format ──
        const results = detectFormat(sample, store.customPresets);
        store.setDetectionResults(results);

        if (results.length > 0) {
          const best = results[0];
          store.setFormat(best.preset, best.confidence);
        }

        // ── Step 3: Parse the full file in chunks ──
        const activePreset = results[0]?.preset;
        if (!activePreset) {
          store.setLoading(false);
          return;
        }

        let pendingEntry: ReturnType<typeof parseLines>["pendingEntry"] = null;
        let totalEntries = 0;
        const allEntries: ReturnType<typeof parseLines>["entries"] = [];

        await streamFile(file, {
          onChunk: (lines, progress) => {
            const result = parseLines(lines, activePreset, pendingEntry);
            pendingEntry = result.pendingEntry;

            if (result.entries.length > 0) {
              allEntries.push(...result.entries);
              totalEntries += result.entries.length;

              // Batch updates to the store every ~500 entries to avoid spam
              if (totalEntries % 500 < result.entries.length || progress >= 1) {
                store.addEntries(result.entries);
              }
              store.setParseProgress(progress, totalEntries);
            }
          },
          onComplete: () => {
            // Flush the last pending entry
            if (pendingEntry) {
              allEntries.push(pendingEntry);
              store.addEntries([pendingEntry]);
            }

            // Build signature groups
            store.finalizeGroups();
            store.setParseProgress(1, totalEntries + (pendingEntry ? 1 : 0));
            store.setLoading(false);
          },
          onError: (error) => {
            console.error("File reading error:", error);
            store.setLoading(false);
          },
        });
      } catch (error) {
        console.error("Processing error:", error);
        store.setLoading(false);
      }
    },
    [store]
  );

  const handleReparse = useCallback(async () => {
    // Re-parse with the updated format
    const file = currentFileRef.current;
    if (!file || !store.detectedFormat) return;

    // Reset entries but keep file + format info
    const format = store.detectedFormat;
    const confidence = store.confidence;
    store.reset();
    resetCounters();
    store.setFile(file.name, file.size);
    store.setFormat(format, confidence);
    store.setLoading(true);

    let pendingEntry: ReturnType<typeof parseLines>["pendingEntry"] = null;
    let totalEntries = 0;

    await streamFile(file, {
      onChunk: (lines, progress) => {
        const result = parseLines(lines, format, pendingEntry);
        pendingEntry = result.pendingEntry;

        if (result.entries.length > 0) {
          totalEntries += result.entries.length;
          if (totalEntries % 500 < result.entries.length || progress >= 1) {
            store.addEntries(result.entries);
          }
          store.setParseProgress(progress, totalEntries);
        }
      },
      onComplete: () => {
        if (pendingEntry) {
          store.addEntries([pendingEntry]);
        }
        store.finalizeGroups();
        store.setParseProgress(1, totalEntries + (pendingEntry ? 1 : 0));
        store.setLoading(false);
      },
      onError: (error) => {
        console.error("Re-parse error:", error);
        store.setLoading(false);
      },
    });
  }, [store]);

  const hasFile = !!store.fileName;
  const hasEntries = store.entries.length > 0;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[var(--bg)]">
      {/* ── Header / Nav ─── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-heading font-bold text-[var(--text-primary)] tracking-tight">
            LogLens
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          All data stays local
        </div>
      </header>

      {/* ── Top Panel Controls (shrink-0) ─── */}
      <div className="shrink-0 flex flex-col">
        {hasFile && <DropZone onFileSelected={handleFileSelected} />}
        {hasFile && (
          <FormatBanner
            onEditPattern={() => setShowPatternEditor(true)}
          />
        )}
        <ParseProgress />
        <SummaryPanel />
        <FilterBar />
      </div>

      {/* ── Main Content Area (flex-1 min-h-0 overflow-hidden) ─── */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden w-full">
        {!hasFile ? (
          <DropZone onFileSelected={handleFileSelected} />
        ) : (
          <LogList />
        )}
      </main>

      {/* ── Pattern Editor Modal ─── */}
      <PatternEditor
        isOpen={showPatternEditor}
        onClose={() => setShowPatternEditor(false)}
        onApply={() => {
          setShowPatternEditor(false);
          handleReparse();
        }}
        sampleLines={fileSampleLines}
      />
    </div>
  );
}
