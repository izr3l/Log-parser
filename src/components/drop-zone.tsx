"use client";

import React, { useCallback, useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/file-reader";
import { useLogStore } from "@/store/log-store";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
}

export default function DropZone({ onFileSelected }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileName = useLogStore((s) => s.fileName);
  const fileSize = useLogStore((s) => s.fileSize);
  const isLoading = useLogStore((s) => s.isLoading);
  const reset = useLogStore((s) => s.reset);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelected(files[0]);
      }
    },
    [onFileSelected]
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [reset]
  );

  // ── Compact header bar (file already loaded) ──
  if (fileName) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 bg-[var(--surface-1)] border-b border-[var(--border)] backdrop-blur-xl">
        <FileText className="w-5 h-5 text-[var(--accent)]" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-[var(--text-primary)] truncate block">
            {fileName}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {formatFileSize(fileSize)}
          </span>
        </div>
        {!isLoading && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Load a different file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Full-screen drop zone ─────────────────────
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        onClick={handleClick}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative w-full max-w-2xl aspect-[16/9] rounded-2xl border-2 border-dashed",
          "flex flex-col items-center justify-center gap-4 cursor-pointer",
          "transition-all duration-300 ease-out group",
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02] shadow-[0_0_40px_var(--accent-glow)]"
            : "border-[var(--border)] bg-[var(--surface-1)]/50 hover:border-[var(--accent)]/50 hover:bg-[var(--surface-1)]"
        )}
      >
        {/* Animated gradient ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
            "bg-gradient-to-r from-[var(--accent)]/0 via-[var(--accent)]/10 to-[var(--accent)]/0",
            isDragging ? "opacity-100 animate-pulse" : "group-hover:opacity-50"
          )}
        />

        <div
          className={cn(
            "relative w-16 h-16 rounded-2xl flex items-center justify-center",
            "bg-[var(--accent)]/10 text-[var(--accent)]",
            "transition-transform duration-300",
            isDragging ? "scale-110" : "group-hover:scale-105"
          )}
        >
          <Upload className="w-8 h-8" />
        </div>

        <div className="relative text-center">
          <h2 className="text-xl font-heading font-semibold text-[var(--text-primary)] mb-1">
            {isDragging ? "Release to analyse" : "Drop your log file here"}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            or{" "}
            <span className="text-[var(--accent)] underline underline-offset-4 decoration-[var(--accent)]/40">
              click to browse
            </span>{" "}
            — all parsing happens locally
          </p>
        </div>

        <div className="relative flex items-center gap-2 mt-2">
          {["Syslog", "JSON", "Apache", "Generic"].map((fmt) => (
            <span
              key={fmt}
              className="px-2.5 py-1 text-[10px] font-mono rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]"
            >
              {fmt}
            </span>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".log,.txt,.json,.csv,*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
