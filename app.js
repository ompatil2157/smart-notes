/**
 * Smart Notes Main Application Controller
 * Connects UI, state, markdown renderer, graph canvas, and smart analytics.
 */

class SmartNotesApp {
  constructor() {
    this.storage = window.storageManager;
    this.parser = window.markdownParser;
    this.smart = window.smartEngine;
    this.sound = window.soundEffects;

    this.activeNoteId = null;
    this.currentFolder = 'all'; // 'all', 'pinned', 'trash', or specific folder id
    this.selectedTag = null;
    this.searchQuery = '';
    this.viewMode = 'split'; // 'split', 'edit', 'preview'
    this.isSmartPanelOpen = true;

    this.saveTimeout = null;
    this.graphInstance = null;

    this.init();
  }

  init() {
    // Apply saved settings
    this.applySettings();

    // Setup DOM References
    this.cacheDom();

    // Register Event Handlers
    this.bindEvents();

    // Initial render
    this.renderSidebar();
    this.renderNotesList();

    // Open first note or create one
    const notes = this.storage.getAllNotes();
    if (notes.length > 0) {
      this.selectNote(notes[0].id);
    } else {
      this.createNewNote();
    }
  }

  cacheDom() {
    this.dom = {
      appContainer: document.getElementById('appContainer'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      sidebar: document.getElementById('sidebar'),
      folderList: document.getElementById('folderList'),
      tagList: document.getElementById('tagList'),
      notesListContainer: document.getElementById('notesListContainer'),
      searchInput: document.getElementById('searchInput'),
      notesCountLabel: document.getElementById('notesCountLabel'),
      activeFilterTitle: document.getElementById('activeFilterTitle'),
      btnNewNote: document.getElementById('btnNewNote'),
      btnNewNoteSidebar: document.getElementById('btnNewNoteSidebar'),
      editorArea: document.getElementById('editorArea'),
      noteTitleInput: document.getElementById('noteTitleInput'),
      noteFolderSelect: document.getElementById('noteFolderSelect'),
      noteTagsContainer: document.getElementById('noteTagsContainer'),
      tagInput: document.getElementById('tagInput'),
      noteTextarea: document.getElementById('noteTextarea'),
      previewPane: document.getElementById('previewPane'),
      previewContent: document.getElementById('previewContent'),
      saveStatusBadge: document.getElementById('saveStatusBadge'),
      btnViewSplit: document.getElementById('btnViewSplit'),
      btnViewEdit: document.getElementById('btnViewEdit'),
      btnViewPreview: document.getElementById('btnViewPreview'),
      btnPinNote: document.getElementById('btnPinNote'),
      btnDeleteNote: document.getElementById('btnDeleteNote'),
      btnSmartPanelToggle: document.getElementById('btnSmartPanelToggle'),
      smartPanel: document.getElementById('smartPanel'),
      // Smart Panel items
      metricWords: document.getElementById('metricWords'),
      metricChars: document.getElementById('metricChars'),
      metricReadingTime: document.getElementById('metricReadingTime'),
      metricReadability: document.getElementById('metricReadability'),
      smartSummaryContent: document.getElementById('smartSummaryContent'),
      smartActionsContent: document.getElementById('smartActionsContent'),
      smartTagsContent: document.getElementById('smartTagsContent'),
      // Graph Modal
      graphModal: document.getElementById('graphModal'),
      btnOpenGraph: document.getElementById('btnOpenGraph'),
      btnCloseGraph: document.getElementById('btnCloseGraph'),
      btnGraphZoomIn: document.getElementById('btnGraphZoomIn'),
      btnGraphZoomOut: document.getElementById('btnGraphZoomOut'),
      btnGraphReset: document.getElementById('btnGraphReset'),
      graphCanvas: document.getElementById('graphCanvas'),
      // Export / Import
      btnExportMenu: document.getElementById('btnExportMenu'),
      exportDropdown: document.getElementById('exportDropdown'),
      exportMdBtn: document.getElementById('exportMdBtn'),
      exportTxtBtn: document.getElementById('exportTxtBtn'),
      exportPdfBtn: document.getElementById('exportPdfBtn'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      importFileInput: document.getElementById('importFileInput'),
      btnImportBackup: document.getElementById('btnImportBackup'),
      // Shortcuts modal
      shortcutsModal: document.getElementById('shortcutsModal'),
      btnShortcuts: document.getElementById('btnShortcuts'),
      btnCloseShortcuts: document.getElementById('btnCloseShortcuts')
    };
  }

  applySettings() {
    const s = this.storage.settings;
    document.documentElement.setAttribute('data-theme', s.theme || 'dark');
    this.sound.setEnabled(s.soundEnabled !== false);
    this.viewMode = s.viewMode || 'split';
  }

  bindEvents() {
    // Theme toggle
    this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Sound toggle
    this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());

    // New Note buttons
    this.dom.btnNewNote.addEventListener('click', () => this.createNewNote());
    if (this.dom.btnNewNoteSidebar) {
      this.dom.btnNewNoteSidebar.addEventListener('click', () => this.createNewNote());
    }

    // Search input
    this.dom.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderNotesList();
    });

    // Editor inputs
    this.dom.noteTitleInput.addEventListener('input', () => {
      this.sound.playType();
      this.onNoteModified();
    });

    this.dom.noteFolderSelect.addEventListener('change', () => {
      this.sound.playClick();
      this.onNoteModified();
      this.renderNotesList();
    });

    this.dom.noteTextarea.addEventListener('input', () => {
      this.sound.playType();
      this.onNoteModified();
    });

    // Tag input on Enter
    this.dom.tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tag = this.dom.tagInput.value.trim().replace(/^#/, '');
        if (tag) {
          this.addTagToActiveNote(tag);
          this.dom.tagInput.value = '';
        }
      }
    });

    // Pin & Delete
    this.dom.btnPinNote.addEventListener('click', () => this.toggleActiveNotePin());
    this.dom.btnDeleteNote.addEventListener('click', () => this.deleteActiveNote());

    // View Modes
    this.dom.btnViewSplit.addEventListener('click', () => this.setViewMode('split'));
    this.dom.btnViewEdit.addEventListener('click', () => this.setViewMode('edit'));
    this.dom.btnViewPreview.addEventListener('click', () => this.setViewMode('preview'));

    // Smart Panel Drawer Toggle
    this.dom.btnSmartPanelToggle.addEventListener('click', () => this.toggleSmartPanel());

    // Toolbar formatting
    document.querySelectorAll('[data-format]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = btn.getAttribute('data-format');
        this.applyFormat(format);
      });
    });

    // Synchronized scroll
    let isSyncingLeft = false;
    let isSyncingRight = false;
    this.dom.noteTextarea.addEventListener('scroll', () => {
      if (!isSyncingLeft && this.viewMode === 'split') {
        isSyncingRight = true;
        const ratio = this.dom.noteTextarea.scrollTop / (this.dom.noteTextarea.scrollHeight - this.dom.noteTextarea.clientHeight || 1);
        this.dom.previewPane.scrollTop = ratio * (this.dom.previewPane.scrollHeight - this.dom.previewPane.clientHeight);
        setTimeout(() => isSyncingRight = false, 50);
      }
    });

    this.dom.previewPane.addEventListener('scroll', () => {
      if (!isSyncingRight && this.viewMode === 'split') {
        isSyncingLeft = true;
        const ratio = this.dom.previewPane.scrollTop / (this.dom.previewPane.scrollHeight - this.dom.previewPane.clientHeight || 1);
        this.dom.noteTextarea.scrollTop = ratio * (this.dom.noteTextarea.scrollHeight - this.dom.noteTextarea.clientHeight);
        setTimeout(() => isSyncingLeft = false, 50);
      }
    });

    // Interactive Preview clicks: Checkboxes, Wikilinks, Copy Code
    this.dom.previewPane.addEventListener('click', (e) => {
      // 1. Task Checkbox click
      if (e.target.classList.contains('task-checkbox')) {
        const lineIdx = parseInt(e.target.getAttribute('data-line-index'), 10);
        this.toggleCheckboxAtLine(lineIdx, e.target.checked);
        this.sound.playClick();
        return;
      }

      // 2. Wikilink click
      const wikilinkAnchor = e.target.closest('.wikilink');
      if (wikilinkAnchor) {
        e.preventDefault();
        const targetTitle = wikilinkAnchor.getAttribute('data-wikilink');
        this.navigateToWikilink(targetTitle);
        this.sound.playClick();
        return;
      }
    });

    // Graph Modal triggers
    this.dom.btnOpenGraph.addEventListener('click', () => this.openGraphModal());
    this.dom.btnCloseGraph.addEventListener('click', () => this.closeGraphModal());
    this.dom.btnGraphZoomIn.addEventListener('click', () => this.graphInstance && this.graphInstance.zoomIn());
    this.dom.btnGraphZoomOut.addEventListener('click', () => this.graphInstance && this.graphInstance.zoomOut());
    this.dom.btnGraphReset.addEventListener('click', () => this.graphInstance && this.graphInstance.resetView());

    // Shortcuts Modal
    this.dom.btnShortcuts.addEventListener('click', () => {
      this.dom.shortcutsModal.classList.add('active');
    });
    this.dom.btnCloseShortcuts.addEventListener('click', () => {
      this.dom.shortcutsModal.classList.remove('active');
    });

    // Export Dropdown menu
    this.dom.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.exportDropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      this.dom.exportDropdown.classList.remove('active');
    });

    this.dom.exportMdBtn.addEventListener('click', () => this.exportCurrentNote('md'));
    this.dom.exportTxtBtn.addEventListener('click', () => this.exportCurrentNote('txt'));
    this.dom.exportPdfBtn.addEventListener('click', () => window.print());
    this.dom.exportJsonBtn.addEventListener('click', () => this.exportVaultJson());

    // Import file
    this.dom.btnImportBackup.addEventListener('click', () => this.dom.importFileInput.click());
    this.dom.importFileInput.addEventListener('change', (e) => this.handleFileImport(e));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.createNewNote();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.forceSave();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.applyFormat('bold');
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        this.applyFormat('italic');
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.applyFormat('wikilink');
      } else if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.openGraphModal();
      } else if (e.key === 'Escape') {
        this.dom.graphModal.classList.remove('active');
        this.dom.shortcutsModal.classList.remove('active');
      }
    });
  }

  // --- Theme & Audio ---
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    this.storage.saveSettings({ theme: next });
    this.sound.playToggle(next === 'light');
    if (this.graphInstance) {
      this.graphInstance.render();
    }
  }

  toggleSound() {
    const enabled = !this.sound.enabled;
    this.sound.setEnabled(enabled);
    this.storage.saveSettings({ soundEnabled: enabled });
    this.dom.soundToggleBtn.classList.toggle('active', enabled);
    this.dom.soundToggleBtn.setAttribute('title', enabled ? 'Sound Effects: On' : 'Sound Effects: Off');
    if (enabled) this.sound.playSuccess();
  }

  // --- View Mode ---
  setViewMode(mode) {
    this.viewMode = mode;
    this.storage.saveSettings({ viewMode: mode });
    this.sound.playClick();

    this.dom.btnViewSplit.classList.toggle('active', mode === 'split');
    this.dom.btnViewEdit.classList.toggle('active', mode === 'edit');
    this.dom.btnViewPreview.classList.toggle('active', mode === 'preview');

    this.dom.editorArea.className = `editor-workspace mode-${mode}`;
  }

  toggleSmartPanel() {
    this.isSmartPanelOpen = !this.isSmartPanelOpen;
    this.dom.smartPanel.classList.toggle('collapsed', !this.isSmartPanelOpen);
    this.dom.btnSmartPanelToggle.classList.toggle('active', this.isSmartPanelOpen);
    this.sound.playClick();
  }

  // --- Sidebar & Folders ---
  renderSidebar() {
    // Populate folders
    const allNotes = this.storage.getAllNotes(false);
    const trashedNotes = this.storage.getTrashNotes();
    const pinnedNotes = allNotes.filter(n => n.pinned);

    let html = `
      <div class="nav-item ${this.currentFolder === 'all' && !this.selectedTag ? 'active' : ''}" data-folder="all">
        <span class="nav-icon">📚</span>
        <span class="nav-title">All Notes</span>
        <span class="nav-count">${allNotes.length}</span>
      </div>
      <div class="nav-item ${this.currentFolder === 'pinned' && !this.selectedTag ? 'active' : ''}" data-folder="pinned">
        <span class="nav-icon">📌</span>
        <span class="nav-title">Pinned</span>
        <span class="nav-count">${pinnedNotes.length}</span>
      </div>
      <div class="nav-divider"></div>
      <div class="nav-section-header">CATEGORIES</div>
    `;

    this.storage.folders.forEach(f => {
      const count = allNotes.filter(n => n.folder === f.id).length;
      html += `
        <div class="nav-item ${this.currentFolder === f.id && !this.selectedTag ? 'active' : ''}" data-folder="${f.id}">
          <span class="nav-icon">${f.icon}</span>
          <span class="nav-title">${f.name}</span>
          <span class="nav-count">${count}</span>
        </div>
      `;
    });

    html += `
      <div class="nav-divider"></div>
      <div class="nav-item ${this.currentFolder === 'trash' && !this.selectedTag ? 'active' : ''}" data-folder="trash">
        <span class="nav-icon">🗑️</span>
        <span class="nav-title">Trash</span>
        <span class="nav-count">${trashedNotes.length}</span>
      </div>
    `;

    this.dom.folderList.innerHTML = html;

    // Folder click events
    this.dom.folderList.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const folder = item.getAttribute('data-folder');
        this.currentFolder = folder;
        this.selectedTag = null;
        this.sound.playClick();
        this.renderSidebar();
        this.renderNotesList();
      });
    });

    // Populate Folder Select Dropdown
    let selectHtml = '';
    this.storage.folders.forEach(f => {
      selectHtml += `<option value="${f.id}">${f.icon} ${f.name}</option>`;
    });
    this.dom.noteFolderSelect.innerHTML = selectHtml;

    // Populate Tags in Sidebar
    const tags = this.storage.getAllTags();
    if (tags.length === 0) {
      this.dom.tagList.innerHTML = '<div class="empty-hint">No tags yet</div>';
    } else {
      let tagHtml = '';
      tags.forEach(t => {
        const isSelected = this.selectedTag === t.tag;
        tagHtml += `
          <div class="sidebar-tag-chip ${isSelected ? 'active' : ''}" data-tag="${t.tag}">
            <span class="tag-hash">#</span>
            <span class="tag-label">${t.tag}</span>
            <span class="tag-count">${t.count}</span>
          </div>
        `;
      });
      this.dom.tagList.innerHTML = tagHtml;

      this.dom.tagList.querySelectorAll('.sidebar-tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const tag = chip.getAttribute('data-tag');
          if (this.selectedTag === tag) {
            this.selectedTag = null;
          } else {
            this.selectedTag = tag;
          }
          this.sound.playClick();
          this.renderSidebar();
          this.renderNotesList();
        });
      });
    }
  }

  // --- Notes List ---
  renderNotesList() {
    let notes = [];
    if (this.currentFolder === 'trash') {
      notes = this.storage.getTrashNotes();
      this.dom.activeFilterTitle.textContent = 'Trash';
    } else {
      notes = this.storage.getAllNotes(false);
      if (this.currentFolder === 'pinned') {
        notes = notes.filter(n => n.pinned);
        this.dom.activeFilterTitle.textContent = 'Pinned Notes';
      } else if (this.currentFolder !== 'all') {
        const f = this.storage.folders.find(x => x.id === this.currentFolder);
        notes = notes.filter(n => n.folder === this.currentFolder);
        this.dom.activeFilterTitle.textContent = f ? `${f.icon} ${f.name}` : 'Notes';
      } else {
        this.dom.activeFilterTitle.textContent = 'All Notes';
      }
    }

    // Filter by tag if active
    if (this.selectedTag) {
      notes = notes.filter(n => (n.tags || []).some(t => t.toLowerCase() === this.selectedTag.toLowerCase()));
      this.dom.activeFilterTitle.textContent = `#${this.selectedTag}`;
    }

    // Filter by search query
    if (this.searchQuery) {
      notes = notes.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(this.searchQuery);
        const contentMatch = (n.content || '').toLowerCase().includes(this.searchQuery);
        const tagMatch = (n.tags || []).some(t => t.toLowerCase().includes(this.searchQuery));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Sort: pinned first, then newest updated
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    this.dom.notesCountLabel.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;

    if (notes.length === 0) {
      this.dom.notesListContainer.innerHTML = `
        <div class="empty-list-message">
          <div class="empty-icon">📝</div>
          <div class="empty-title">No notes found</div>
          <div class="empty-subtitle">${this.searchQuery ? 'Try a different search term' : 'Click "+ New Note" to create one'}</div>
        </div>
      `;
      return;
    }

    let html = '';
    notes.forEach(n => {
      const isActive = n.id === this.activeNoteId;
      const cleanSnippet = this.smart.stripMarkdown(n.content).substring(0, 100);
      const timeStr = this.formatDate(n.updatedAt);

      html += `
        <div class="note-card ${isActive ? 'active' : ''} ${n.pinned ? 'pinned' : ''}" data-id="${n.id}">
          <div class="note-card-header">
            <h4 class="note-card-title">${this.parser.escapeHtml(n.title || 'Untitled')}</h4>
            ${n.pinned ? '<span class="pinned-indicator" title="Pinned Note">📌</span>' : ''}
          </div>
          <p class="note-card-snippet">${this.parser.escapeHtml(cleanSnippet || 'No content yet...')}</p>
          <div class="note-card-footer">
            <span class="note-card-date">${timeStr}</span>
            <div class="note-card-tags">
              ${(n.tags || []).slice(0, 2).map(t => `<span class="mini-tag">#${this.parser.escapeHtml(t)}</span>`).join('')}
              ${(n.tags || []).length > 2 ? `<span class="mini-tag-more">+${n.tags.length - 2}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    this.dom.notesListContainer.innerHTML = html;

    // Card click events
    this.dom.notesListContainer.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        this.selectNote(id);
        this.sound.playClick();
      });
    });
  }

  // --- Note Selection & Editing ---
  selectNote(id) {
    const note = this.storage.getNoteById(id);
    if (!note) return;

    this.activeNoteId = id;
    this.dom.noteTitleInput.value = note.title;
    this.dom.noteFolderSelect.value = note.folder || 'ideas';
    this.dom.noteTextarea.value = note.content || '';

    // Update pin & trash buttons
    this.dom.btnPinNote.classList.toggle('active', !!note.pinned);
    this.dom.btnPinNote.title = note.pinned ? 'Unpin note' : 'Pin note';

    if (note.trashed) {
      this.dom.btnDeleteNote.title = 'Permanently delete';
      this.dom.btnDeleteNote.innerHTML = '🔥 Delete Forever';
    } else {
      this.dom.btnDeleteNote.title = 'Move to trash';
      this.dom.btnDeleteNote.innerHTML = '🗑️ Trash';
    }

    this.renderNoteTags(note.tags || []);
    this.updatePreviewAndAnalytics(note.content);

    // Re-render notes list active state
    this.renderNotesList();
  }

  renderNoteTags(tags) {
    let html = '';
    tags.forEach(tag => {
      html += `
        <span class="note-tag-pill">
          #${this.parser.escapeHtml(tag)}
          <span class="tag-remove" data-tag="${this.parser.escapeHtml(tag)}">&times;</span>
        </span>
      `;
    });
    this.dom.noteTagsContainer.innerHTML = html;

    this.dom.noteTagsContainer.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.getAttribute('data-tag');
        this.removeTagFromActiveNote(tag);
      });
    });
  }

  addTagToActiveNote(tag) {
    if (!this.activeNoteId || !tag) return;
    const note = this.storage.getNoteById(this.activeNoteId);
    if (!note) return;
    const cleanTag = tag.trim().toLowerCase();
    if (!note.tags) note.tags = [];
    if (!note.tags.includes(cleanTag)) {
      note.tags.push(cleanTag);
      this.storage.updateNote(this.activeNoteId, { tags: note.tags });
      this.renderNoteTags(note.tags);
      this.renderSidebar();
      this.renderNotesList();
      this.updateSmartInsights(note.content);
      this.sound.playClick();
    }
  }

  removeTagFromActiveNote(tag) {
    if (!this.activeNoteId) return;
    const note = this.storage.getNoteById(this.activeNoteId);
    if (!note || !note.tags) return;
    note.tags = note.tags.filter(t => t !== tag);
    this.storage.updateNote(this.activeNoteId, { tags: note.tags });
    this.renderNoteTags(note.tags);
    this.renderSidebar();
    this.renderNotesList();
    this.updateSmartInsights(note.content);
    this.sound.playClick();
  }

  createNewNote(initialTitle = 'Untitled Note', initialFolder = null, initialContent = '') {
    const folder = initialFolder || (this.currentFolder !== 'all' && this.currentFolder !== 'trash' && this.currentFolder !== 'pinned' ? this.currentFolder : 'ideas');
    const newNote = this.storage.createNote({
      title: initialTitle,
      folder: folder,
      content: initialContent
    });
    this.sound.playSuccess();
    this.renderSidebar();
    this.renderNotesList();
    this.selectNote(newNote.id);
    this.dom.noteTitleInput.focus();
    this.dom.noteTitleInput.select();
  }

  onNoteModified() {
    if (!this.activeNoteId) return;

    this.dom.saveStatusBadge.textContent = 'Saving...';
    this.dom.saveStatusBadge.className = 'save-status saving';

    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    const title = this.dom.noteTitleInput.value.trim() || 'Untitled Note';
    const folder = this.dom.noteFolderSelect.value;
    const content = this.dom.noteTextarea.value;

    // Live preview update immediately
    this.updatePreviewAndAnalytics(content);

    this.saveTimeout = setTimeout(() => {
      this.storage.updateNote(this.activeNoteId, { title, folder, content });
      this.dom.saveStatusBadge.textContent = 'Saved';
      this.dom.saveStatusBadge.className = 'save-status saved';
      this.renderNotesList();
      this.renderSidebar();
    }, this.storage.settings.autoSaveDelay || 400);
  }

  forceSave() {
    if (!this.activeNoteId) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    const title = this.dom.noteTitleInput.value.trim() || 'Untitled Note';
    const folder = this.dom.noteFolderSelect.value;
    const content = this.dom.noteTextarea.value;

    this.storage.updateNote(this.activeNoteId, { title, folder, content });
    this.dom.saveStatusBadge.textContent = 'Saved!';
    this.dom.saveStatusBadge.className = 'save-status saved';
    this.sound.playSuccess();
    this.renderNotesList();
    this.renderSidebar();
  }

  toggleActiveNotePin() {
    if (!this.activeNoteId) return;
    const isPinned = this.storage.togglePin(this.activeNoteId);
    this.dom.btnPinNote.classList.toggle('active', isPinned);
    this.sound.playToggle(isPinned);
    this.renderSidebar();
    this.renderNotesList();
  }

  deleteActiveNote() {
    if (!this.activeNoteId) return;
    const note = this.storage.getNoteById(this.activeNoteId);
    if (!note) return;

    if (note.trashed) {
      if (confirm('Permanently delete this note? This action cannot be undone.')) {
        this.storage.trashNote(this.activeNoteId);
        this.sound.playClick();
        this.activeNoteId = null;
        this.renderSidebar();
        this.renderNotesList();
        const remaining = this.storage.getTrashNotes();
        if (remaining.length > 0) this.selectNote(remaining[0].id);
        else this.clearEditor();
      }
    } else {
      this.storage.trashNote(this.activeNoteId);
      this.sound.playClick();
      this.activeNoteId = null;
      this.renderSidebar();
      this.renderNotesList();
      const remaining = this.storage.getAllNotes(false);
      if (remaining.length > 0) this.selectNote(remaining[0].id);
      else this.createNewNote();
    }
  }

  clearEditor() {
    this.dom.noteTitleInput.value = '';
    this.dom.noteTextarea.value = '';
    this.dom.previewContent.innerHTML = '';
    this.dom.noteTagsContainer.innerHTML = '';
  }

  // --- Markdown Preview & Analytics ---
  updatePreviewAndAnalytics(markdown) {
    // 1. Render Markdown
    const html = this.parser.render(markdown);
    this.dom.previewContent.innerHTML = html;

    // 2. Update Smart Insights
    this.updateSmartInsights(markdown);
  }

  updateSmartInsights(markdown) {
    const metrics = this.smart.getMetrics(markdown);
    this.dom.metricWords.textContent = metrics.words.toLocaleString();
    this.dom.metricChars.textContent = metrics.chars.toLocaleString();
    this.dom.metricReadingTime.textContent = metrics.readingTimeFormatted;
    this.dom.metricReadability.textContent = `${metrics.fleschScore} (${metrics.readabilityLabel})`;

    // Generate summary
    const summaryBullets = this.smart.generateSummary(markdown, 3);
    let summaryHtml = '<ul class="smart-summary-list">';
    summaryBullets.forEach(s => {
      summaryHtml += `<li>${this.parser.escapeHtml(s)}</li>`;
    });
    summaryHtml += '</ul>';
    this.dom.smartSummaryContent.innerHTML = summaryHtml;

    // Extract action items
    const actions = this.smart.extractActionItems(markdown);
    if (actions.length === 0) {
      this.dom.smartActionsContent.innerHTML = '<div class="smart-hint">No action items detected. Use "- [ ]" to track tasks!</div>';
    } else {
      let actHtml = '<div class="smart-actions-list">';
      actions.forEach(a => {
        actHtml += `
          <div class="smart-action-item ${a.completed ? 'completed' : ''}">
            <span class="action-icon">${a.completed ? '✅' : '⏳'}</span>
            <span class="action-text">${this.parser.escapeHtml(a.text)}</span>
          </div>
        `;
      });
      actHtml += '</div>';
      this.dom.smartActionsContent.innerHTML = actHtml;
    }

    // Suggested tags
    const activeNote = this.storage.getNoteById(this.activeNoteId);
    const existing = activeNote ? (activeNote.tags || []) : [];
    const suggested = this.smart.suggestTags(markdown, existing);

    if (suggested.length === 0) {
      this.dom.smartTagsContent.innerHTML = '<div class="smart-hint">Add more content to get smart tag suggestions.</div>';
    } else {
      let tagsHtml = '<div class="smart-tags-pill-group">';
      suggested.forEach(tag => {
        tagsHtml += `
          <button class="smart-tag-btn" data-suggest-tag="${this.parser.escapeHtml(tag)}">
            + #${this.parser.escapeHtml(tag)}
          </button>
        `;
      });
      tagsHtml += '</div>';
      this.dom.smartTagsContent.innerHTML = tagsHtml;

      this.dom.smartTagsContent.querySelectorAll('[data-suggest-tag]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-suggest-tag');
          this.addTagToActiveNote(tag);
        });
      });
    }
  }

  // --- Interactive Checkbox Toggle in Preview ---
  toggleCheckboxAtLine(lineIndex, isChecked) {
    const raw = this.dom.noteTextarea.value;
    const lines = raw.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const targetLine = lines[lineIndex];
      const match = targetLine.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
      if (match) {
        const replacement = `${match[1]}${isChecked ? 'x' : ' '}${match[3]}`;
        lines[lineIndex] = replacement;
        this.dom.noteTextarea.value = lines.join('\n');
        this.onNoteModified();
      }
    }
  }

  // --- Wikilink Navigation ---
  navigateToWikilink(targetTitle) {
    const existing = this.storage.getNoteByTitle(targetTitle);
    if (existing) {
      this.selectNote(existing.id);
    } else {
      // Prompt to create
      if (confirm(`Note "${targetTitle}" does not exist yet. Would you like to create it now?`)) {
        this.createNewNote(targetTitle, 'ideas', `# ${targetTitle}\n\nConnected from [[${this.dom.noteTitleInput.value}]].`);
      }
    }
  }

  // --- Formatting Toolbar ---
  applyFormat(type) {
    const textarea = this.dom.noteTextarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'strike':
        replacement = `~~${selected || 'strikethrough text'}~~`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Heading 1'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Heading 2'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'h3':
        replacement = `\n### ${selected || 'Heading 3'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        replacement = `\`${selected || 'code'}\``;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'codeblock':
        replacement = `\n\`\`\`javascript\n${selected || '// Write code here'}\n\`\`\`\n`;
        cursorOffset = replacement.length;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Quote text'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'task':
        replacement = `\n- [ ] ${selected || 'New actionable task'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'number':
        replacement = `\n1. ${selected || 'Numbered item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :---: | ---: |\n| Item 1 | Details | Value |\n| Item 2 | Details | Value |\n`;
        cursorOffset = replacement.length;
        break;
      case 'wikilink':
        replacement = `[[${selected || 'Note Title'}]]`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'date':
        const dateStr = new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        replacement = ` **${dateStr}** `;
        cursorOffset = replacement.length;
        break;
      default:
        return;
    }

    textarea.focus();
    textarea.setRangeText(replacement, start, end, 'select');
    textarea.selectionStart = start + cursorOffset;
    textarea.selectionEnd = start + cursorOffset;

    this.sound.playClick();
    this.onNoteModified();
  }

  // --- Knowledge Graph Modal ---
  openGraphModal() {
    this.dom.graphModal.classList.add('active');
    this.sound.playClick();

    setTimeout(() => {
      if (!this.graphInstance) {
        this.graphInstance = new window.KnowledgeGraph('graphCanvas', {
          onSelectNode: (noteId) => {
            this.closeGraphModal();
            this.selectNote(noteId);
          }
        });
      }
      this.graphInstance.resize();
      this.graphInstance.setData(this.storage.getAllNotes(false), this.activeNoteId);
    }, 50);
  }

  closeGraphModal() {
    this.dom.graphModal.classList.remove('active');
    this.sound.playClick();
  }

  // --- Export & Import ---
  exportCurrentNote(format = 'md') {
    const note = this.storage.getNoteById(this.activeNoteId);
    if (!note) return;

    let mimeType = 'text/markdown';
    let ext = '.md';
    let content = note.content;

    if (format === 'txt') {
      mimeType = 'text/plain';
      ext = '.txt';
      content = this.smart.stripMarkdown(note.content);
    }

    const filename = (note.title || 'untitled').replace(/[^a-zA-Z0-9_\-]/g, '_') + ext;
    this.downloadFile(content, filename, mimeType);
    this.sound.playSuccess();
  }

  exportVaultJson() {
    const json = this.storage.exportAllJSON();
    const dateStr = new Date().toISOString().split('T')[0];
    this.downloadFile(json, `smart_notes_vault_backup_${dateStr}.json`, 'application/json');
    this.sound.playSuccess();
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const res = this.storage.importJSON(text);
      if (res.success) {
        alert(`Successfully restored ${res.count} notes!`);
        this.sound.playSuccess();
        this.renderSidebar();
        this.renderNotesList();
        const notes = this.storage.getAllNotes(false);
        if (notes.length > 0) this.selectNote(notes[0].id);
      } else {
        alert(`Import failed: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffHours * 60));
      return `${mins}m ago`;
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new SmartNotesApp();
});
