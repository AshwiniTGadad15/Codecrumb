/**
 * CodeCrumb – Unique Developer Features & Utilities (features.js)
 * Includes Developer Quote of the Day, Achievement Badges, Random Knowledge Recall,
 * Global Cross-Section Search, Clipboard Utility, and XSS-Safe HTML Escaping.
 */

(function (global) {
  'use strict';

  const DEVELOPER_QUOTES = [
    {
      text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
      author: 'Harold Abelson & Gerald Jay Sussman'
    },
    {
      text: 'First, solve the problem. Then, write the code.',
      author: 'John Johnson'
    },
    {
      text: 'Make it work, make it right, make it fast.',
      author: 'Kent Beck'
    },
    {
      text: 'Debugging is twice as hard as writing the code in the first place.',
      author: 'Brian W. Kernighan'
    },
    {
      text: 'Simplicity is prerequisite for reliability.',
      author: 'Edsger W. Dijkstra'
    },
    {
      text: 'Weeks of coding can save you hours of planning.',
      author: 'Anonymous Engineering Maxim'
    },
    {
      text: 'Every bug you document today is an hour you give back to your future self.',
      author: 'Developer Craft Principle'
    },
    {
      text: 'Clean code always looks like it was written by someone who cares.',
      author: 'Robert C. Martin'
    },
    {
      text: 'Small, consistent daily practice compounds faster than occasional marathon sessions.',
      author: 'Continuous Learning Principle'
    },
    {
      text: 'Good software, like wine, takes time — and clear notes along the way.',
      author: 'Joel Spolsky'
    },
    {
      text: 'Before software can be reusable it first has to be usable.',
      author: 'Ralph Johnson'
    },
    {
      text: 'Understanding the root cause is worth ten times more than applying a quick patch.',
      author: 'Systems Debugging Ethos'
    }
  ];

  const LANGUAGES = [
    'JavaScript',
    'TypeScript',
    'HTML/CSS',
    'Python',
    'Java',
    'C++',
    'Go',
    'Rust',
    'SQL',
    'Git',
    'DevOps',
    'System Design',
    'Algorithms',
    'Other'
  ];

  const COMMAND_CATEGORIES = [
    'Git Commands',
    'Terminal Commands',
    'VS Code Shortcuts',
    'Programming Tips'
  ];

  /**
   * Escapes special HTML characters to safely render user input.
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Returns a deterministic Developer Quote of the Day, with optional offset cycling.
   * @param {number} [offset=0]
   * @returns {{ text: string, author: string }}
   */
  function getQuoteOfTheDay(offset) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);
    const idx = (dayOfYear + (offset || 0)) % DEVELOPER_QUOTES.length;
    return DEVELOPER_QUOTES[idx < 0 ? idx + DEVELOPER_QUOTES.length : idx];
  }

  /**
   * Evaluates achievement badges strictly from real user records and real streaks.
   * @param {object} state
   * @param {object} streakStats
   * @returns {Array}
   */
  function evaluateBadges(state, streakStats) {
    const learningCount = (state.learning || []).length;
    const bugCount = (state.bugs || []).length;
    const snippetCount = (state.snippets || []).length;
    const commandCount = (state.commands || []).length;
    const totalItems = learningCount + bugCount + snippetCount + commandCount;
    const bestStreak = Math.max(streakStats.currentStreak || 0, streakStats.longestStreak || 0);

    const defs = [
      {
        id: 'first-entry',
        name: 'First Entry',
        description: 'Document your very first daily learning note.',
        icon: 'sparkles',
        current: Math.min(learningCount, 1),
        target: 1,
        unit: 'entry',
        unlocked: learningCount >= 1
      },
      {
        id: 'streak-7',
        name: '7-Day Learner',
        description: 'Maintain a 7-day consecutive coding journal streak.',
        icon: 'flame',
        current: Math.min(bestStreak, 7),
        target: 7,
        unit: 'days',
        unlocked: bestStreak >= 7
      },
      {
        id: 'streak-14',
        name: '14-Day Momentum',
        description: 'Reach 14 consecutive days of documented learning.',
        icon: 'zap',
        current: Math.min(bestStreak, 14),
        target: 14,
        unit: 'days',
        unlocked: bestStreak >= 14
      },
      {
        id: 'streak-30',
        name: '30-Day Learner',
        description: 'Build an unstoppable 30-day developer learning streak.',
        icon: 'trophy',
        current: Math.min(bestStreak, 30),
        target: 30,
        unit: 'days',
        unlocked: bestStreak >= 30
      },
      {
        id: 'bug-hunter',
        name: 'Bug Hunter',
        description: 'Record 3 bugs along with their root-cause fixes.',
        icon: 'bug',
        current: Math.min(bugCount, 3),
        target: 3,
        unit: 'bugs',
        unlocked: bugCount >= 3
      },
      {
        id: 'snippet-architect',
        name: 'Snippet Architect',
        description: 'Curate 5 reusable code snippets in your library.',
        icon: 'code-2',
        current: Math.min(snippetCount, 5),
        target: 5,
        unit: 'snippets',
        unlocked: snippetCount >= 5
      },
      {
        id: 'command-master',
        name: 'Command Master',
        description: 'Save 5 Git, terminal, or editor commands for fast recall.',
        icon: 'terminal',
        current: Math.min(commandCount, 5),
        target: 5,
        unit: 'commands',
        unlocked: commandCount >= 5
      },
      {
        id: 'knowledge-vault',
        name: 'Knowledge Vault',
        description: 'Accumulate 20 total records across all CodeCrumb modules.',
        icon: 'archive',
        current: Math.min(totalItems, 20),
        target: 20,
        unit: 'items',
        unlocked: totalItems >= 20
      }
    ];

    return defs;
  }

  /**
   * Selects a random learning entry for spaced-repetition Knowledge Recall.
   * Avoids repeating the currently shown entry when 2+ entries exist.
   * @param {Array} learningEntries
   * @param {string|null} excludeId
   * @returns {object|null}
   */
  function pickRandomRecall(learningEntries, excludeId) {
    if (!learningEntries || learningEntries.length === 0) return null;
    if (learningEntries.length === 1) return learningEntries[0];

    const pool = learningEntries.filter((item) => item.id !== excludeId);
    const list = pool.length > 0 ? pool : learningEntries;
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }

  /**
   * Searches across Learning, Bugs, Snippets, and Commands simultaneously.
   * @param {object} state
   * @param {string} query
   * @returns {Array}
   */
  function globalSearch(state, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const results = [];

    (state.learning || []).forEach((item) => {
      const hay = `${item.title} ${item.language} ${item.content} ${item.date}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          type: 'learning',
          typeLabel: 'Daily Learning',
          view: 'learning',
          id: item.id,
          title: item.title,
          meta: `${item.language} · ${item.date}`
        });
      }
    });

    (state.bugs || []).forEach((item) => {
      const hay = `${item.title} ${item.language} ${item.error} ${item.solution}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          type: 'bugs',
          typeLabel: 'Bug Diary',
          view: 'bugs',
          id: item.id,
          title: item.title,
          meta: `${item.language} · Bug Fix`
        });
      }
    });

    (state.snippets || []).forEach((item) => {
      const hay = `${item.title} ${item.language} ${item.description} ${item.code}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          type: 'snippets',
          typeLabel: 'Code Snippets',
          view: 'snippets',
          id: item.id,
          title: item.title,
          meta: `${item.language} · Snippet`
        });
      }
    });

    (state.commands || []).forEach((item) => {
      const hay = `${item.title} ${item.category} ${item.command} ${item.notes || ''}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          type: 'commands',
          typeLabel: 'Useful Commands',
          view: 'commands',
          id: item.id,
          title: item.title,
          meta: `${item.category} · ${item.command}`
        });
      }
    });

    return results.slice(0, 12);
  }

  /**
   * Builds a unified recent activity feed across all 4 modules.
   * @param {object} state
   * @param {number} [limit=6]
   * @returns {Array}
   */
  function getRecentActivities(state, limit) {
    const items = [];

    (state.learning || []).forEach((e) => {
      items.push({
        id: e.id,
        view: 'learning',
        kind: 'Learning',
        title: e.title,
        subtitle: e.language,
        date: e.date,
        sortKey: e.updatedAt || e.createdAt || e.date
      });
    });

    (state.bugs || []).forEach((b) => {
      items.push({
        id: b.id,
        view: 'bugs',
        kind: 'Bug Fix',
        title: b.title,
        subtitle: b.language,
        date: b.date || (b.createdAt || '').slice(0, 10),
        sortKey: b.updatedAt || b.createdAt || ''
      });
    });

    (state.snippets || []).forEach((s) => {
      items.push({
        id: s.id,
        view: 'snippets',
        kind: 'Snippet',
        title: s.title,
        subtitle: s.language,
        date: (s.createdAt || '').slice(0, 10),
        sortKey: s.updatedAt || s.createdAt || ''
      });
    });

    (state.commands || []).forEach((c) => {
      items.push({
        id: c.id,
        view: 'commands',
        kind: 'Command',
        title: c.title,
        subtitle: c.category,
        date: (c.createdAt || '').slice(0, 10),
        sortKey: c.updatedAt || c.createdAt || ''
      });
    });

    return items
      .sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
      .slice(0, limit || 6);
  }

  /**
   * Copies text to the system clipboard with a resilient fallback for local file:// contexts.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && global.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_err) {
      // Fallback below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Boolean(copied);
    } catch (_err) {
      return false;
    }
  }

  global.CodeCrumb = global.CodeCrumb || {};
  global.CodeCrumb.Features = {
    LANGUAGES,
    COMMAND_CATEGORIES,
    escapeHTML,
    getQuoteOfTheDay,
    evaluateBadges,
    pickRandomRecall,
    globalSearch,
    getRecentActivities,
    copyToClipboard
  };
})(window);
