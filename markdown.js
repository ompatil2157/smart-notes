/**
 * Lightweight, high-performance Markdown & Wikilink Parser
 * Supports CommonMark subset, GFM Tables, Task Lists, Code Blocks with Copy,
 * GitHub Alerts, and Obsidian-style [[Wikilinks]].
 */

class MarkdownParser {
  constructor() {
    this.tableBuffer = [];
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  extractWikilinks(text) {
    if (!text) return [];
    const regex = /\[\[(.*?)\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const full = match[1].trim();
      const target = full.split('|')[0].trim();
      if (target && !links.includes(target)) {
        links.push(target);
      }
    }
    return links;
  }

  extractHeadings(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const headings = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: idx
        });
      }
    });
    return headings;
  }

  render(markdown) {
    if (!markdown) return '<div class="empty-preview">Start typing your thoughts...</div>';

    // 1. Pre-process code blocks
    const codeBlocks = [];
    let processed = markdown.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `%%CODE_BLOCK_${codeBlocks.length}%%`;
      codeBlocks.push({ lang: lang || 'text', code });
      return placeholder;
    });

    const lines = processed.split('\n');
    const htmlLines = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol'
    let inBlockquote = false;
    let bqBuffer = [];
    let inTable = false;
    let tableRows = [];

    const flushList = () => {
      if (inList) {
        htmlLines.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
    };

    const flushBlockquote = () => {
      if (inBlockquote) {
        const fullContent = bqBuffer.join('\n');
        // Check for alert callouts: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
        const alertMatch = fullContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)$/i);
        if (alertMatch) {
          const type = alertMatch[1].toUpperCase();
          const body = this.renderInline(alertMatch[2].trim());
          htmlLines.push(`<div class="callout callout-${type.toLowerCase()}"><div class="callout-title">${type}</div><div class="callout-body">${body}</div></div>`);
        } else {
          htmlLines.push(`<blockquote>${this.renderInline(fullContent)}</blockquote>`);
        }
        inBlockquote = false;
        bqBuffer = [];
      }
    };

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        htmlLines.push(this.renderTable(tableRows));
        inTable = false;
        tableRows = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check Table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        flushBlockquote();
        inTable = true;
        tableRows.push(trimmed);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Check Blockquote
      if (trimmed.startsWith('>')) {
        flushList();
        inBlockquote = true;
        bqBuffer.push(trimmed.replace(/^>\s?/, ''));
        return;
      } else if (inBlockquote) {
        flushBlockquote();
      }

      // Check Task List
      const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
          htmlLines.push('<ul class="task-list">');
        }
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const taskText = this.renderInline(taskMatch[3]);
        htmlLines.push(
          `<li class="task-list-item">
            <label>
              <input type="checkbox" class="task-checkbox" data-line-index="${index}" ${isChecked ? 'checked' : ''} />
              <span class="${isChecked ? 'completed-task' : ''}">${taskText}</span>
            </label>
          </li>`
        );
        return;
      }

      // Check Standard Bullet List
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
          htmlLines.push('<ul>');
        }
        htmlLines.push(`<li>${this.renderInline(ulMatch[2])}</li>`);
        return;
      }

      // Check Numbered List
      const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
          htmlLines.push('<ol>');
        }
        htmlLines.push(`<li>${this.renderInline(olMatch[2])}</li>`);
        return;
      }

      // Not in list
      flushList();

      // Empty line
      if (!trimmed) {
        return;
      }

      // Horizontal Rule
      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        htmlLines.push('<hr class="markdown-hr" />');
        return;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = this.renderInline(headingMatch[2]);
        const id = headingMatch[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        htmlLines.push(`<h${level} id="${id}">${text}</h${level}>`);
        return;
      }

      // Code block placeholder
      if (trimmed.startsWith('%%CODE_BLOCK_')) {
        htmlLines.push(trimmed);
        return;
      }

      // Paragraph
      htmlLines.push(`<p>${this.renderInline(line)}</p>`);
    });

    flushList();
    flushBlockquote();
    flushTable();

    let output = htmlLines.join('\n');

    // Re-inject Code Blocks
    output = output.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, idx) => {
      const block = codeBlocks[parseInt(idx, 10)];
      if (!block) return '';
      const escapedCode = this.escapeHtml(block.code);
      const copyId = `code_${Date.now()}_${idx}`;
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang-tag">${this.escapeHtml(block.lang)}</span>
            <button class="btn-copy-code" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(block.code)}')); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy', 2000);">
              Copy
            </button>
          </div>
          <pre><code class="language-${this.escapeHtml(block.lang)}">${escapedCode}</code></pre>
        </div>
      `;
    });

    return output;
  }

  renderTable(rows) {
    if (rows.length < 2) return '';
    const parseCells = row =>
      row.split('|')
        .slice(1, -1)
        .map(cell => cell.trim());

    const headers = parseCells(rows[0]);
    const alignLine = parseCells(rows[1]);
    const aligns = alignLine.map(a => {
      if (a.startsWith(':') && a.endsWith(':')) return 'center';
      if (a.endsWith(':')) return 'right';
      return 'left';
    });

    let html = '<div class="table-container"><table class="markdown-table"><thead><tr>';
    headers.forEach((h, i) => {
      const align = aligns[i] ? ` style="text-align:${aligns[i]}"` : '';
      html += `<th${align}>${this.renderInline(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    for (let i = 2; i < rows.length; i++) {
      const cells = parseCells(rows[i]);
      html += '<tr>';
      cells.forEach((c, ci) => {
        const align = aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '';
        html += `<td${align}>${this.renderInline(c)}</td>`;
      });
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
  }

  renderInline(text) {
    if (!text) return '';

    // First preserve inline code
    const inlineCodes = [];
    let out = text.replace(/`([^`]+)`/g, (match, code) => {
      const ph = `%%INLINE_CODE_${inlineCodes.length}%%`;
      inlineCodes.push(this.escapeHtml(code));
      return ph;
    });

    // Wikilinks: [[Target]] or [[Target|Label]]
    out = out.replace(/\[\[(.*?)\]\]/g, (match, linkContent) => {
      const parts = linkContent.split('|');
      const target = parts[0].trim();
      const label = (parts[1] || parts[0]).trim();
      return `<a href="#" class="wikilink" data-wikilink="${this.escapeHtml(target)}" title="Jump to note: ${this.escapeHtml(target)}">🔗 ${this.escapeHtml(label)}</a>`;
    });

    // Images: ![alt](url)
    out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(alt)}" class="markdown-img" loading="lazy" />`;
    });

    // Markdown Links: [label](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
      return `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="external-link">${this.renderInline(label)} ↗</a>`;
    });

    // Bold + Italic: ***text*** or ___text___
    out = out.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // Bold: **text** or __text__
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    out = out.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Restore inline codes
    out = out.replace(/%%INLINE_CODE_(\d+)%%/g, (match, idx) => {
      return `<code class="inline-code">${inlineCodes[parseInt(idx, 10)]}</code>`;
    });

    return out;
  }
}

window.markdownParser = new MarkdownParser();
