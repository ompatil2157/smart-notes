/**
 * Smart Note Intelligence & Analytics Engine
 * Provides client-side summarization, action item extraction,
 * auto-tag recommendations, and readability metrics.
 */

class SmartEngine {
  constructor() {
    this.stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'to', 'of', 'with',
      'as', 'by', 'that', 'it', 'this', 'from', 'be', 'are', 'was', 'were', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'but', 'not', 'so', 'can', 'could', 'will', 'would',
      'should', 'what', 'when', 'where', 'who', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same', 'than',
      'too', 'very', 'just', 'your', 'my', 'their', 'our', 'his', 'her', 'its', 'about'
    ]);
  }

  // Clean raw markdown to pure plain text
  stripMarkdown(md) {
    if (!md) return '';
    return md
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[\[(.*?)\]\]/g, '$1') // wikilinks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/!\[.*?\]\(.*?\)/g, '') // images
      .replace(/#{1,6}\s+/g, '') // headers
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // italic
      .replace(/~~(.*?)~~/g, '$1') // strikethrough
      .replace(/>\s?/g, '') // blockquotes
      .replace(/[-*+]\s+\[[ xX]\]\s+/g, '') // tasks
      .replace(/[-*+]\s+/g, '') // list items
      .replace(/^\d+\.\s+/gm, '') // numbered lists
      .replace(/\|/g, ' ') // tables
      .replace(/\n+/g, ' ') // newlines to space
      .trim();
  }

  // Live Metrics: Words, Characters, Reading Time
  getMetrics(text) {
    if (!text || !text.trim()) {
      return {
        words: 0,
        chars: 0,
        readingTimeMinutes: 0,
        readingTimeFormatted: '< 1 min',
        sentences: 0,
        fleschScore: 100,
        readabilityLabel: 'N/A'
      };
    }

    const plain = this.stripMarkdown(text);
    const wordsArr = plain.split(/\s+/).filter(w => w.length > 0);
    const words = wordsArr.length;
    const chars = text.length;

    // Sentences
    const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;

    // Reading time (average 200 words/minute)
    const minutes = Math.ceil(words / 200);
    const readingTimeFormatted = minutes <= 1 ? '1 min read' : `${minutes} min read`;

    // Estimate syllables for Flesch Reading Ease
    let totalSyllables = 0;
    wordsArr.forEach(word => {
      totalSyllables += this.countSyllables(word);
    });

    // Flesch Reading Ease Formula = 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    let flesch = 100;
    if (words > 0 && sentences > 0) {
      flesch = Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (totalSyllables / words));
      flesch = Math.max(0, Math.min(100, flesch));
    }

    let readabilityLabel = 'Very Easy';
    if (flesch < 30) readabilityLabel = 'Very Technical / Academic';
    else if (flesch < 50) readabilityLabel = 'Advanced';
    else if (flesch < 60) readabilityLabel = 'Fairly Challenging';
    else if (flesch < 70) readabilityLabel = 'Plain English / Standard';
    else if (flesch < 80) readabilityLabel = 'Easy to Read';

    return {
      words,
      chars,
      readingTimeMinutes: minutes,
      readingTimeFormatted,
      sentences,
      fleschScore: flesch,
      readabilityLabel
    };
  }

  countSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    if (w.length <= 3) return 1;
    const clean = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
    const matches = clean.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  // Instant Key Points Summarizer
  generateSummary(text, maxSentences = 3) {
    if (!text || text.trim().length < 50) {
      return ['Note is too short to generate a summary. Add more details to enable smart insights!'];
    }

    const plain = this.stripMarkdown(text);
    // Split sentences
    const rawSentences = plain.match(/[^.!?]+[.!?]+/g) || [plain];
    const sentences = rawSentences.map(s => s.trim()).filter(s => s.length > 20);

    if (sentences.length <= maxSentences) {
      return sentences;
    }

    // Word frequency map
    const words = plain.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const freq = {};
    words.forEach(w => {
      if (w.length > 3 && !this.stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });

    // Score sentences
    const scored = sentences.map((sentence, index) => {
      const sWords = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      let score = 0;
      sWords.forEach(w => {
        score += freq[w] || 0;
      });
      // Normalize by length with modest penalty for extreme lengths
      score = score / Math.sqrt(sWords.length || 1);
      // Give slight preference to opening sentences
      if (index === 0) score *= 1.3;
      return { sentence, score, index };
    });

    // Pick top sentences preserving chronological flow
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, maxSentences).sort((a, b) => a.index - b.index);

    return selected.map(item => item.sentence);
  }

  // Action Items Extractor
  extractActionItems(text) {
    if (!text) return [];
    const items = [];
    const lines = text.split('\n');

    // 1. Pull markdown task lists
    lines.forEach(line => {
      const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        items.push({
          text: taskMatch[2].trim(),
          completed: taskMatch[1].toLowerCase() === 'x',
          source: 'task'
        });
      }
    });

    // 2. Identify implicit actions ("TODO:", "action item:", "need to", "must")
    const actionKeywords = /\b(todo|action item|must|need to|ensure that|follow up with|deadline|verify)\b/i;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- [') && actionKeywords.test(trimmed)) {
        const clean = trimmed.replace(/^(#+|\*|-|>|\d+\.)\s*/, '');
        if (clean.length > 10 && !items.some(i => i.text === clean)) {
          items.push({
            text: clean,
            completed: false,
            source: 'inferred'
          });
        }
      }
    });

    return items;
  }

  // Smart Tag & Keyword Generator
  suggestTags(text, existingTags = []) {
    if (!text) return [];
    const plain = this.stripMarkdown(text).toLowerCase();
    const tokens = plain.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);

    const counts = {};
    tokens.forEach(tok => {
      const clean = tok.trim();
      if (clean.length >= 4 && !this.stopWords.has(clean) && !/^\d+$/.test(clean)) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });

    const currentTagSet = new Set(existingTags.map(t => t.toLowerCase()));

    return Object.entries(counts)
      .filter(([tag]) => !currentTagSet.has(tag))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }
}

window.smartEngine = new SmartEngine();
