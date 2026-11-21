/**
 * CodeCrumb – LocalStorage Persistence Layer (storage.js)
 * Manages all developer journal data locally in the browser with schema validation,
 * duplicate protection, JSON backup/restore, and safe error handling.
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'codecrumb_data_v1';
  const SCHEMA_VERSION = 1;

  /**
   * Formats a Date object as local YYYY-MM-DD (avoids UTC offset bugs).
   * @param {Date} date
   * @returns {string}
   */
  function toLocalISODate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns a YYYY-MM-DD date string shifted by `offsetDays` from today.
   * @param {number} offsetDays
   * @returns {string}
   */
  function getRelativeDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toLocalISODate(d);
  }

  /**
   * Generates a unique client-side identifier.
   * @param {string} prefix
   * @returns {string}
   */
  function generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
  }

  /**
   * Creates a clean empty state structure.
   * @returns {object}
   */
  function createEmptyState() {
    return {
      version: SCHEMA_VERSION,
      initialized: true,
      settings: {
        userName: 'Developer',
        theme: 'navy'
      },
      dailyGoals: {},
      learning: [],
      bugs: [],
      snippets: [],
      commands: []
    };
  }

  /**
   * Creates a realistic first-run starter workspace so users can immediately explore
   * all features. Every item is a real stored record and can be edited or deleted.
   * Streak calculations always run directly on these real saved learning entries.
   * @returns {object}
   */
  function createStarterState() {
    const today = getRelativeDate(0);
    const yesterday = getRelativeDate(-1);
    const nowIso = new Date().toISOString();

    return {
      version: SCHEMA_VERSION,
      initialized: true,
      settings: {
        userName: 'Developer',
        theme: 'navy'
      },
      dailyGoals: {
        [today]: {
          text: 'Document one debugging takeaway and organize two reusable snippets',
          completed: false,
          updatedAt: nowIso
        }
      },
      learning: [
        {
          id: generateId('lrn'),
          title: 'Event Delegation with closest() in Vanilla JavaScript',
          language: 'JavaScript',
          date: today,
          content:
            'Instead of attaching individual click listeners to dynamic cards or table rows, attach a single listener to a parent container and match targets with event.target.closest("[data-action]"). This reduces memory overhead and keeps newly rendered DOM nodes interactive automatically.',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: generateId('lrn'),
          title: 'Avoiding UTC Date Shift Bugs in Calendar Heatmaps',
          language: 'JavaScript',
          date: yesterday,
          content:
            'Calling new Date("2026-11-20") parses ISO date-only strings as UTC midnight, which shifts to the previous day in negative UTC offsets. Building Date objects with new Date(year, monthIndex, day) keeps streak calculations aligned with local midnight.',
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ],
      bugs: [
        {
          id: generateId('bug'),
          title: 'Clipboard API Fails Inside Non-HTTPS Local Previews',
          language: 'JavaScript',
          date: today,
          error:
            'TypeError: Cannot read properties of undefined (reading "writeText") when testing copy buttons over file:// or restricted iframe sandboxes.',
          solution:
            'Check navigator.clipboard && window.isSecureContext first, and gracefully fall back to creating a temporary off-screen textarea with document.execCommand("copy") before removing it.',
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ],
      snippets: [
        {
          id: generateId('snp'),
          title: 'Debounce Function for Instant Search Inputs',
          language: 'JavaScript',
          description:
            'Delays invoking a callback until typing pauses for a specified duration, keeping filter rendering smooth on large lists.',
          code: `function debounce(fn, delay = 200) {\n  let timerId;\n  return (...args) => {\n    clearTimeout(timerId);\n    timerId = setTimeout(() => fn.apply(null, args), delay);\n  };\n}`,
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: generateId('snp'),
          title: 'Responsive Auto-Fit CSS Grid Container',
          language: 'HTML/CSS',
          description:
            'Creates an evenly spaced card grid that wraps cleanly across desktop, tablet, and mobile without manual breakpoint rules.',
          code: `.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.25rem;\n}`,
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ],
      commands: [
        {
          id: generateId('cmd'),
          title: 'Compact Git History Graph',
          category: 'Git Commands',
          command: 'git log --oneline --graph --decorate -n 15',
          notes: 'Quickly inspect recent branches, merges, and commit hashes in a single terminal screen.',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: generateId('cmd'),
          title: 'Undo Last Commit While Keeping Changes',
          category: 'Git Commands',
          command: 'git reset --soft HEAD~1',
          notes: 'Moves HEAD back one commit while keeping all edited files staged.',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: generateId('cmd'),
          title: 'Find Process Using a Local Port',
          category: 'Terminal Commands',
          command: 'lsof -i :3000',
          notes: 'Shows the PID listening on port 3000 on macOS/Linux so you can cleanly stop stale dev servers.',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: generateId('cmd'),
          title: 'Multi-Cursor Select Next Match',
          category: 'VS Code Shortcuts',
          command: 'Ctrl + D  (macOS: Cmd + D)',
          notes: 'Selects the next occurrence of the highlighted symbol for rapid inline renaming.',
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ]
    };
  }

  /**
   * Normalizes loaded/imported state so missing keys never break the UI.
   * @param {object} raw
   * @returns {object}
   */
  function normalizeState(raw) {
    const base = createEmptyState();
    if (!raw || typeof raw !== 'object') {
      return base;
    }

    const validThemes = ['navy', 'obsidian', 'light'];
    const theme = raw.settings && validThemes.includes(raw.settings.theme) ? raw.settings.theme : 'navy';
    const userName =
      raw.settings && typeof raw.settings.userName === 'string' && raw.settings.userName.trim()
        ? raw.settings.userName.trim().slice(0, 40)
        : 'Developer';

    return {
      version: SCHEMA_VERSION,
      initialized: true,
      settings: { userName, theme },
      dailyGoals: raw.dailyGoals && typeof raw.dailyGoals === 'object' ? raw.dailyGoals : {},
      learning: Array.isArray(raw.learning) ? raw.learning.filter(isValidLearning) : [],
      bugs: Array.isArray(raw.bugs) ? raw.bugs.filter(isValidBug) : [],
      snippets: Array.isArray(raw.snippets) ? raw.snippets.filter(isValidSnippet) : [],
      commands: Array.isArray(raw.commands) ? raw.commands.filter(isValidCommand) : []
    };
  }

  function isValidLearning(item) {
    return item && typeof item.title === 'string' && typeof item.content === 'string' && typeof item.date === 'string';
  }

  function isValidBug(item) {
    return item && typeof item.title === 'string' && typeof item.error === 'string' && typeof item.solution === 'string';
  }

  function isValidSnippet(item) {
    return item && typeof item.title === 'string' && typeof item.code === 'string';
  }

  function isValidCommand(item) {
    return item && typeof item.title === 'string' && typeof item.command === 'string';
  }

  let stateCache = null;

  /**
   * Loads state from LocalStorage (seeds starter workspace on first visit).
   * @returns {object}
   */
  function loadState() {
    if (stateCache) return stateCache;

    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        stateCache = createStarterState();
        persistState(stateCache);
        return stateCache;
      }
      const parsed = JSON.parse(raw);
      stateCache = normalizeState(parsed);
      return stateCache;
    } catch (err) {
      console.error('CodeCrumb storage read error:', err);
      stateCache = createEmptyState();
      return stateCache;
    }
  }

  /**
   * Writes state to LocalStorage safely.
   * @param {object} nextState
   * @returns {{ ok: boolean, error?: string }}
   */
  function persistState(nextState) {
    stateCache = nextState;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return { ok: true };
    } catch (err) {
      console.error('CodeCrumb storage write error:', err);
      return { ok: false, error: 'Unable to save to LocalStorage. Browser storage may be full or restricted.' };
    }
  }

  /**
   * Case-insensitive trimmed comparison helper for duplicate checks.
   */
  function norm(str) {
    return String(str || '').trim().toLowerCase();
  }

  const Storage = {
    STORAGE_KEY,
    toLocalISODate,

    getState() {
      return loadState();
    },

    /* ---------------- Settings ---------------- */
    getSettings() {
      return { ...loadState().settings };
    },

    updateSettings(partial) {
      const state = loadState();
      const validThemes = ['navy', 'obsidian', 'light'];
      if (typeof partial.userName === 'string') {
        const cleaned = partial.userName.trim().slice(0, 40);
        state.settings.userName = cleaned || 'Developer';
      }
      if (partial.theme && validThemes.includes(partial.theme)) {
        state.settings.theme = partial.theme;
      }
      return persistState(state);
    },

    /* ---------------- Daily Coding Goal ---------------- */
    getTodayGoal() {
      const state = loadState();
      const today = toLocalISODate(new Date());
      return state.dailyGoals[today] || null;
    },

    saveTodayGoal(text, completed) {
      const state = loadState();
      const today = toLocalISODate(new Date());
      const cleaned = String(text || '').trim();
      if (!cleaned) {
        delete state.dailyGoals[today];
      } else {
        state.dailyGoals[today] = {
          text: cleaned,
          completed: Boolean(completed),
          updatedAt: new Date().toISOString()
        };
      }
      return persistState(state);
    },

    toggleTodayGoal() {
      const state = loadState();
      const today = toLocalISODate(new Date());
      const goal = state.dailyGoals[today];
      if (!goal) return { ok: false, error: 'No goal set for today.' };
      goal.completed = !goal.completed;
      goal.updatedAt = new Date().toISOString();
      const res = persistState(state);
      return { ...res, goal };
    },

    /* ---------------- Daily Learning Journal ---------------- */
    getLearningEntries() {
      return [...loadState().learning].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    },

    saveLearningEntry(payload, editId) {
      const state = loadState();
      const title = String(payload.title || '').trim();
      const language = String(payload.language || 'JavaScript').trim();
      const date = String(payload.date || toLocalISODate(new Date())).trim();
      const content = String(payload.content || '').trim();

      if (!title || !content || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, error: 'Please provide a valid title, date, and learning notes.' };
      }

      const duplicate = state.learning.some(
        (item) => item.id !== editId && norm(item.title) === norm(title) && item.date === date
      );
      if (duplicate) {
        return { ok: false, error: 'A learning entry with this exact title and date already exists.' };
      }

      const now = new Date().toISOString();
      if (editId) {
        const index = state.learning.findIndex((item) => item.id === editId);
        if (index === -1) return { ok: false, error: 'Learning entry not found.' };
        state.learning[index] = {
          ...state.learning[index],
          title,
          language,
          date,
          content,
          updatedAt: now
        };
      } else {
        state.learning.unshift({
          id: generateId('lrn'),
          title,
          language,
          date,
          content,
          createdAt: now,
          updatedAt: now
        });
      }

      return persistState(state);
    },

    deleteLearningEntry(id) {
      const state = loadState();
      state.learning = state.learning.filter((item) => item.id !== id);
      return persistState(state);
    },

    /* ---------------- Bug Diary ---------------- */
    getBugs() {
      return [...loadState().bugs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },

    saveBug(payload, editId) {
      const state = loadState();
      const title = String(payload.title || '').trim();
      const language = String(payload.language || 'JavaScript').trim();
      const error = String(payload.error || '').trim();
      const solution = String(payload.solution || '').trim();
      const date = String(payload.date || toLocalISODate(new Date())).trim();

      if (!title || !error || !solution) {
        return { ok: false, error: 'Please complete the bug title, error description, and solution.' };
      }

      const duplicate = state.bugs.some(
        (item) => item.id !== editId && norm(item.title) === norm(title) && norm(item.language) === norm(language)
      );
      if (duplicate) {
        return { ok: false, error: 'A bug record with this title and language already exists.' };
      }

      const now = new Date().toISOString();
      if (editId) {
        const index = state.bugs.findIndex((item) => item.id === editId);
        if (index === -1) return { ok: false, error: 'Bug record not found.' };
        state.bugs[index] = {
          ...state.bugs[index],
          title,
          language,
          error,
          solution,
          date,
          updatedAt: now
        };
      } else {
        state.bugs.unshift({
          id: generateId('bug'),
          title,
          language,
          error,
          solution,
          date,
          createdAt: now,
          updatedAt: now
        });
      }

      return persistState(state);
    },

    deleteBug(id) {
      const state = loadState();
      state.bugs = state.bugs.filter((item) => item.id !== id);
      return persistState(state);
    },

    /* ---------------- Code Snippets ---------------- */
    getSnippets() {
      return [...loadState().snippets].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },

    saveSnippet(payload, editId) {
      const state = loadState();
      const title = String(payload.title || '').trim();
      const language = String(payload.language || 'JavaScript').trim();
      const description = String(payload.description || '').trim();
      const code = String(payload.code || '').replace(/\r\n/g, '\n');

      if (!title || !code.trim() || !description) {
        return { ok: false, error: 'Please provide a snippet title, description, and code block.' };
      }

      const duplicate = state.snippets.some(
        (item) => item.id !== editId && norm(item.title) === norm(title) && norm(item.language) === norm(language)
      );
      if (duplicate) {
        return { ok: false, error: 'A code snippet with this title and language already exists.' };
      }

      const now = new Date().toISOString();
      if (editId) {
        const index = state.snippets.findIndex((item) => item.id === editId);
        if (index === -1) return { ok: false, error: 'Code snippet not found.' };
        state.snippets[index] = {
          ...state.snippets[index],
          title,
          language,
          description,
          code,
          updatedAt: now
        };
      } else {
        state.snippets.unshift({
          id: generateId('snp'),
          title,
          language,
          description,
          code,
          createdAt: now,
          updatedAt: now
        });
      }

      return persistState(state);
    },

    deleteSnippet(id) {
      const state = loadState();
      state.snippets = state.snippets.filter((item) => item.id !== id);
      return persistState(state);
    },

    /* ---------------- Useful Commands ---------------- */
    getCommands() {
      return [...loadState().commands].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },

    saveCommand(payload, editId) {
      const state = loadState();
      const title = String(payload.title || '').trim();
      const category = String(payload.category || 'Git Commands').trim();
      const command = String(payload.command || '').trim();
      const notes = String(payload.notes || '').trim();

      if (!title || !command) {
        return { ok: false, error: 'Please enter both a title and the command or shortcut.' };
      }

      const duplicate = state.commands.some(
        (item) => item.id !== editId && norm(item.command) === norm(command) && norm(item.category) === norm(category)
      );
      if (duplicate) {
        return { ok: false, error: 'This exact command is already saved in that category.' };
      }

      const now = new Date().toISOString();
      if (editId) {
        const index = state.commands.findIndex((item) => item.id === editId);
        if (index === -1) return { ok: false, error: 'Command entry not found.' };
        state.commands[index] = {
          ...state.commands[index],
          title,
          category,
          command,
          notes,
          updatedAt: now
        };
      } else {
        state.commands.unshift({
          id: generateId('cmd'),
          title,
          category,
          command,
          notes,
          createdAt: now,
          updatedAt: now
        });
      }

      return persistState(state);
    },

    deleteCommand(id) {
      const state = loadState();
      state.commands = state.commands.filter((item) => item.id !== id);
      return persistState(state);
    },

    /* ---------------- Export / Import / Clear ---------------- */
    exportJSON() {
      const payload = {
        app: 'CodeCrumb',
        exportedAt: new Date().toISOString(),
        data: loadState()
      };
      return JSON.stringify(payload, null, 2);
    },

    importJSON(rawText) {
      try {
        const parsed = JSON.parse(rawText);
        const candidate = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        if (
          !candidate ||
          (!Array.isArray(candidate.learning) &&
            !Array.isArray(candidate.bugs) &&
            !Array.isArray(candidate.snippets) &&
            !Array.isArray(candidate.commands))
        ) {
          return { ok: false, error: 'Invalid backup file. Expected CodeCrumb JSON structure.' };
        }
        const normalized = normalizeState(candidate);
        const res = persistState(normalized);
        if (!res.ok) return res;
        return {
          ok: true,
          counts: {
            learning: normalized.learning.length,
            bugs: normalized.bugs.length,
            snippets: normalized.snippets.length,
            commands: normalized.commands.length
          }
        };
      } catch (_err) {
        return { ok: false, error: 'Could not parse JSON file. Please select a valid CodeCrumb export.' };
      }
    },

    clearAllData() {
      const empty = createEmptyState();
      return persistState(empty);
    },

    restoreStarterSample() {
      const starter = createStarterState();
      return persistState(starter);
    }
  };

  global.CodeCrumb = global.CodeCrumb || {};
  global.CodeCrumb.Storage = Storage;
})(window);
