/**
 * Storage and Data Management for Smart Notes
 * Supports LocalStorage persistence, export/import, soft delete, and seed data.
 */

const STORAGE_KEY_NOTES = 'smart_notes_vault_v1';
const STORAGE_KEY_SETTINGS = 'smart_notes_settings_v1';

const DEFAULT_FOLDERS = [
  { id: 'work', name: 'Work', icon: '💼' },
  { id: 'personal', name: 'Personal', icon: '☕' },
  { id: 'ideas', name: 'Ideas & Drafts', icon: '💡' },
  { id: 'projects', name: 'Projects', icon: '🎯' },
  { id: 'archive', name: 'Archive', icon: '📦' }
];

const SEED_NOTES = [
  {
    id: 'note_welcome',
    title: '🚀 Welcome to Smart Notes',
    folder: 'ideas',
    tags: ['guide', 'getting-started', 'markdown'],
    pinned: true,
    favorite: true,
    trashed: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Welcome to Smart Notes 🚀

Your high-performance, glassmorphic knowledge base built for thinkers, developers, and writers.

> [!NOTE]
> All your notes are saved locally in your browser with real-time offline persistence. Your data never leaves your device.

---

### ✨ Core Features

- **Bi-directional Wikilinks**: Connect ideas seamlessly using \`[[Note Title]]\` syntax. Try clicking: [[Second Brain Architecture]] or [[System Architecture & Design]]!
- **Interactive Knowledge Graph**: Click the **Graph View** button in the sidebar to explore your interconnected web of thoughts.
- **Smart AI-like Utilities**: Open the right panel to extract instant summaries, action items, reading scores, and suggested tags.
- **Interactive Checklists**: Checkboxes in preview update the note source automatically!

### 📋 Quick Start Checklist
- [x] Launch Smart Notes
- [x] Explore the dark and light themes
- [ ] Try creating your first interconnected note with \`[[Wikilinks]]\`
- [ ] Toggle Split View and Preview Mode
- [ ] Check out the Interactive Knowledge Graph in the top bar!

### 💻 Code Snippets with Syntax Highlighting

\`\`\`javascript
// Smart Notes: Lightning fast client-side markdown
const note = {
  title: "My Genius Idea",
  tags: ["innovation", "future"],
  created: new Date().toLocaleDateString()
};
console.log(\`Captured: \${note.title}\`);
\`\`\`

Enjoy capturing your thoughts with zero friction!`
  },
  {
    id: 'note_second_brain',
    title: '🧠 Second Brain Architecture',
    folder: 'work',
    tags: ['productivity', 'knowledge', 'methods'],
    pinned: true,
    favorite: false,
    trashed: false,
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    content: `# Second Brain Architecture 🧠

A Second Brain is an external, digital memory repository designed to free your mind from having to remember everything.

### 📐 The P.A.R.A. Method

| Section | Definition | Time Horizon |
| :--- | :--- | :--- |
| **Projects** | Series of tasks linked to a goal with a deadline | Weeks / Months |
| **Areas** | Spheres of activity with ongoing standards | Indefinite |
| **Resources** | Topics or themes of ongoing interest | Long-term |
| **Archives** | Inactive items from the other three categories | Historical |

### 🔗 Interconnected Thoughts
- Connected directly with [[Welcome to Smart Notes]]
- Complements the daily principles in [[Deep Work Rituals]]
- Technical implementation referenced in [[System Architecture & Design]]

### 💡 Core Takeaways
1. Capture ideas when inspiration strikes.
2. Structure by **actionability**, not merely by topic.
3. Distill and synthesize insights into modular, atomic notes.`
  },
  {
    id: 'note_system_design',
    title: '⚡ System Architecture & Design',
    folder: 'projects',
    tags: ['tech', 'architecture', 'web'],
    pinned: false,
    favorite: true,
    trashed: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    content: `# System Architecture & Design ⚡

Designing ultra-responsive, zero-dependency client-side web applications.

### 🏛 Architectural Layers

1. **Storage Layer**: LocalStorage / IndexedDB cache with JSON schema versioning and transactional backups.
2. **Parser & Lexer**: Modular regex-driven Markdown tokenizer supporting CommonMark, GFM tables, and Obsidian-style \`[[Wikilinks]]\`.
3. **Graph Engine**: 2D Canvas Force-Directed simulation using Hooke's Law (springs) and Coulomb's Law (electrostatic repulsion).
4. **Smart NLP Core**: Heuristic text analysis for sentence extraction, readability scoring (Flesch Reading Ease), and automated keyword extraction.

### 🔗 Related Reading
- See methodology notes in [[Second Brain Architecture]]
- Check user onboarding in [[Welcome to Smart Notes]]`
  },
  {
    id: 'note_deep_work',
    title: '🌿 Deep Work Rituals',
    folder: 'personal',
    tags: ['focus', 'habits', 'wellness'],
    pinned: false,
    favorite: false,
    trashed: false,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    content: `# Deep Work Rituals 🌿

> "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy." — Cal Newport

### 🎯 Daily Focus Checklist
- [x] Morning meditation and hydration (20 mins)
- [x] Review priority queue in [[Second Brain Architecture]]
- [ ] 90-minute uninterrupted deep work sprint (No notifications)
- [ ] Walk outside without screens
- [ ] End-of-day shutdown routine & note filing

### 🛡️ Distraction Elimination Rules
1. **Never check communications** before 10:00 AM.
2. Work in full-screen or distraction-free mode.
3. Keep ambient sound or binaural beats playing.`
  },
  {
    id: 'note_startup_ideas',
    title: '💡 Startup Ideas & Innovation',
    folder: 'ideas',
    tags: ['startups', 'ideas', 'future'],
    pinned: false,
    favorite: false,
    trashed: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    content: `# Startup Ideas & Innovation 💡

Brainstorming next-generation product concepts.

### 🌟 Active Candidates

1. **Voice-to-Knowledge Pipeline**:
   - Continuous ambient audio transcription -> automatic extraction of decisions, todos, and follow-ups.
   - Integrates with [[Second Brain Architecture]].

2. **Zero-Latency Graph Wiki**:
   - Real-time multiplayer canvas for visual knowledge graphs.
   - Built on ideas from [[System Architecture & Design]].

3. **Autonomous Micro-Agents**:
   - Specialized agents executing repetitive digital workflows with self-healing code.`
  }
];

class StorageManager {
  constructor() {
    this.notes = [];
    this.settings = {
      theme: 'dark',
      soundEnabled: true,
      editorFont: 'sans',
      viewMode: 'split', // 'edit', 'split', 'preview'
      autoSaveDelay: 400
    };
    this.folders = DEFAULT_FOLDERS;
    this.init();
  }

  init() {
    this.loadSettings();
    this.loadNotes();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadNotes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTES);
      if (stored) {
        this.notes = JSON.parse(stored);
      } else {
        // First run - populate seed notes
        this.notes = SEED_NOTES;
        this.saveNotes();
      }
    } catch (e) {
      console.warn('Failed to load notes from localStorage, using seeds:', e);
      this.notes = SEED_NOTES;
    }
  }

  saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(this.notes));
    } catch (e) {
      console.error('Failed to persist notes to localStorage:', e);
    }
  }

  getAllNotes(includeTrash = false) {
    if (includeTrash) return [...this.notes];
    return this.notes.filter(n => !n.trashed);
  }

  getTrashNotes() {
    return this.notes.filter(n => n.trashed);
  }

  getNoteById(id) {
    return this.notes.find(n => n.id === id) || null;
  }

  getNoteByTitle(title) {
    if (!title) return null;
    const clean = title.trim().toLowerCase();
    return this.notes.find(n => !n.trashed && n.title.trim().toLowerCase() === clean) || null;
  }

  createNote(initialData = {}) {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: initialData.title || 'Untitled Note',
      folder: initialData.folder || 'ideas',
      tags: initialData.tags || [],
      pinned: !!initialData.pinned,
      favorite: !!initialData.favorite,
      trashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: initialData.content || ''
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    return newNote;
  }

  updateNote(id, patch) {
    const note = this.getNoteById(id);
    if (!note) return null;
    Object.assign(note, patch, { updatedAt: new Date().toISOString() });
    this.saveNotes();
    return note;
  }

  trashNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    if (note.trashed) {
      // Permanent delete if already in trash
      this.notes = this.notes.filter(n => n.id !== id);
    } else {
      note.trashed = true;
      note.pinned = false;
      note.updatedAt = new Date().toISOString();
    }
    this.saveNotes();
    return true;
  }

  restoreNote(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.trashed = false;
    note.updatedAt = new Date().toISOString();
    this.saveNotes();
    return true;
  }

  emptyTrash() {
    this.notes = this.notes.filter(n => !n.trashed);
    this.saveNotes();
  }

  togglePin(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    this.saveNotes();
    return note.pinned;
  }

  toggleFavorite(id) {
    const note = this.getNoteById(id);
    if (!note) return false;
    note.favorite = !note.favorite;
    note.updatedAt = new Date().toISOString();
    this.saveNotes();
    return note.favorite;
  }

  getAllTags() {
    const counts = {};
    this.getAllNotes(false).forEach(note => {
      (note.tags || []).forEach(t => {
        const tag = t.trim().toLowerCase();
        if (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  exportAllJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: this.notes,
      settings: this.settings
    };
    return JSON.stringify(data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.notes)) {
        throw new Error('Invalid backup file format: missing notes array');
      }
      this.notes = parsed.notes;
      if (parsed.settings) {
        this.settings = { ...this.settings, ...parsed.settings };
        this.saveSettings(this.settings);
      }
      this.saveNotes();
      return { success: true, count: this.notes.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  resetToSeeds() {
    this.notes = JSON.parse(JSON.stringify(SEED_NOTES));
    this.saveNotes();
    return this.notes;
  }
}

window.storageManager = new StorageManager();
