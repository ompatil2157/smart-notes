# ✨ Smart Notes

A state-of-the-art, glassmorphic knowledge base and Markdown note-taking web application with bi-directional wikilinks, interactive force-directed canvas graph, smart client-side intelligence, and full offline persistence.

---

## 🚀 Key Features

### 🎨 Visual & Design Excellence
- **Glassmorphism Design System**: Built with modern CSS custom properties, backdrop blur filters, and subtle ambient glows.
- **Fluid Dark & Light Modes**: Seamless 1-click theme switcher with persistent user preference.
- **Synthesized Micro-Interactions**: Subtle, organic mechanical typing sounds and toggle chimes synthesized using native Web Audio API (zero external audio files).
- **Modern Typography**: Powered by `Plus Jakarta Sans` for clean UI readability and `JetBrains Mono` for code blocks.

### 📝 Markdown & Content Creation
- **Multi-Mode Workspace**: Switch between Split View (synchronized scrolling), Edit Only, and Reading Preview with 1 click.
- **Interactive Checklists**: Clickable `- [ ]` / `- [x]` checkboxes right inside the live preview update the underlying note markdown automatically.
- **Obsidian-Style `[[Wikilinks]]`**: Connect your thoughts with bi-directional note links (`[[Note Title]]`). Clicking any wikilink immediately opens or creates that note.
- **Syntax-Highlighted Code Blocks**: Distinctive code wrappers with language badges and 1-click copy-to-clipboard functionality.
- **GitHub-Style Callout Alerts**: Supported callouts include `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`.
- **GFM Tables**: Full support for markdown tables with custom column alignments.

### 🕸️ Interactive Knowledge Graph
- **2D Canvas Force-Directed Network**: Visualizes your notes as nodes and wikilinks as glowing edges.
- **Interactive Physics**: Drag nodes, zoom in/out with the mouse wheel, pan across the canvas, and hover over nodes to highlight connections.
- **Click to Navigate**: Clicking any node in the graph instantly opens that note in the workspace.

### 🧠 Smart Insights Engine
- **Instant Key Takeaways**: Client-side extractive summarizer extracts core concepts and presents bulleted executive summaries.
- **Action Items & TODOs Extractor**: Automatically pulls out task list items and implicit action phrases across the note.
- **Topic & Tag Suggester**: Recommends high-relevance tags based on term frequency and text analysis; add them with 1 click.
- **Live Readability & Metrics**: Real-time word count, character count, estimated reading time, and Flesch Reading Ease score.

### 💾 Storage, Privacy & Portability
- **Offline First**: All notes and settings are persisted locally in your browser (`localStorage`). No cloud telemetry, complete privacy.
- **Multi-Format Export**: Export any note as Markdown (`.md`), Plain Text (`.txt`), or Print / Save as PDF.
- **Full Vault Backup & Restore**: Export the entire database as a single JSON backup file and restore it at any time.

---

## 🏃 How to Run

### Method 1: Local HTTP Server (Recommended)
Open PowerShell in this directory and run:
```powershell
.\serve.ps1
```
Then open your browser to [http://localhost:8080/](http://localhost:8080/).

### Method 2: Direct File Open
You can directly open `index.html` in Chrome, Edge, Firefox, or Safari:
```text
file:///C:/Users/OWNER/.gemini/antigravity-ide/scratch/smart-notes/index.html
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + N` | Create a new note |
| `Ctrl + S` | Force save active note immediately |
| `Ctrl + B` | Format selection as **Bold** |
| `Ctrl + I` | Format selection as *Italic* |
| `Ctrl + K` | Insert `[[Wikilink]]` syntax |
| `Ctrl + Shift + P` | Open Interactive Knowledge Graph |
| `Ctrl + /` | Open Keyboard Shortcuts cheat sheet |
| `Esc` | Close open modals and overlays |
