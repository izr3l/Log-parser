# LogLens - Browser-Based Log File Parser

LogLens is a privacy-first, browser-based log parser designed to inspect, analyze, and diagnose log files of any size without uploading content to a external server.

All file processing, line splitting, format detection, multi-line grouping, and pattern deduplication take place entirely on the client side using Web Workers and modern browser APIs.

---

## Key Features

- **Privacy-First Architecture**: Log files never leave the browser. All parsing occurs client-side in dedicated background worker threads.
- **Large File Streaming**: Utilizes stream decoding and chunked line processing to analyze multi-hundred megabyte logs smoothly.
- **Format Auto-Detection**: Automatically detects Syslog, JSON-per-line, Apache/Nginx Access, Apache/Nginx Error, and Generic Timestamped log formats with confidence scoring.
- **Live Pattern Editor**: Customize regex patterns with named capture groups and preview real-time parsing match rates on loaded sample lines. Save custom presets to local storage for future reuse.
- **Multi-Line Stack Trace Grouping**: Folds continuation lines, stack traces, and indented detail into their parent log entry.
- **Signature Deduplication**: Normalizes dynamic variables (timestamps, UUIDs, IP addresses, numbers, file paths) to group recurring issues by pattern signature.
- **Virtualized High-Performance Views**: Render thousands of log entries efficiently in both Signature-Grouped and Chronological-Flat view modes using TanStack Virtual.
- **Interactive Filtering & Search**: Instant 1-click severity level isolation (Fatal, Error, Warn, Info, Debug, Trace, Other), text search across raw content, and collapsible overview statistics.

---

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Vanilla CSS Design System
- **UI Components**: shadcn/ui, Lucide Icons
- **State Management**: Zustand
- **Virtualization**: @tanstack/react-virtual
- **Typography**: Syne (headings), Inter (body), JetBrains Mono (log code)

---

## Getting Started

### Prerequisites

Ensure you have Node.js (v18+ recommended) and npm installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/loglens.git
   cd loglens
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Run the development server locally:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build

Build and start the optimized production bundle:
```bash
npm run build
npm run start
```

---

## Built-in Log Format Presets

| Format Name | Detection Pattern | Captured Fields |
| :--- | :--- | :--- |
| **Syslog** | `[timestamp] [host] [process][pid]: [message]` | Timestamp, Host, Process, PID, Message |
| **JSON Logs** | JSON objects with configurable keys | Timestamp, Level, Message, Extra Fields |
| **Web Access** | Combined Log Format (Apache / Nginx) | IP, User, Timestamp, Method, Path, Status, Size |
| **Web Error** | `[timestamp] [level] [pid] [client] [message]` | Timestamp, Module, Level, PID, Client, Message |
| **Generic** | `[timestamp] [level] message` | Timestamp, Level, Message |
| **Fallback** | Unstructured plain text | Line Number, Raw Message |

---

## Project Structure

```
loglens/
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css         # Design system & Tailwind styling
│   │   ├── icon.svg            # Brand SVG Favicon
│   │   ├── layout.tsx          # Root layout & Google Fonts configuration
│   │   └── page.tsx            # Main application layout & orchestrator
│   ├── components/
│   │   ├── drop-zone.tsx       # Drag-and-drop file picker
│   │   ├── entry-detail.tsx    # Raw text inspector
│   │   ├── filter-bar.tsx      # Level toggles & debounced search
│   │   ├── format-banner.tsx   # Detection confidence banner
│   │   ├── log-list.tsx        # Virtualized grouped and flat views
│   │   ├── parse-progress.tsx  # Parsing progress bar
│   │   ├── pattern-editor.tsx  # Custom regex pattern editor modal
│   │   └── summary-panel.tsx   # Statistics panel with collapse toggle
│   ├── lib/
│   │   ├── file-reader.ts      # Chunked stream reader
│   │   ├── format-presets.ts   # Regex presets & level normalization
│   │   ├── signature.ts        # Signature normalization algorithms
│   │   └── utils.ts            # Class merging helpers
│   ├── store/
│   │   └── log-store.ts        # Zustand state store
│   ├── types/
│   │   └── index.ts            # Core TypeScript interfaces
│   └── workers/
│       └── parse-worker.ts     # Client-side log parsing worker
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

MIT License. Free for personal and commercial use.
