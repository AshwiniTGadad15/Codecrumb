/**
 * CodeCrumb – Learning Streak & Contribution Calendar Engine (streak.js)
 * Computes real streaks, active days, weekly activity summaries, and a full-year
 * GitHub-inspired contribution calendar directly from actual saved entries.
 */

(function (global) {
  'use strict';

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Safely parses a YYYY-MM-DD string into a local midnight Date object.
   * @param {string} isoDate
   * @returns {Date|null}
   */
  function parseLocalDate(isoDate) {
    if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return null;
    }
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * Formats a local Date object to YYYY-MM-DD.
   * @param {Date} date
   * @returns {string}
   */
  function formatISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Formats YYYY-MM-DD into a human-readable date string (e.g., "Nov 20, 2026").
   * @param {string} isoDate
   * @returns {string}
   */
  function formatDisplayDate(isoDate) {
    const parsed = parseLocalDate(isoDate);
    if (!parsed) return isoDate || '';
    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Returns day difference between two local midnight Dates (b - a) in whole days.
   * Uses Math.round on noon-normalized dates to avoid DST 23h/25h edge cases.
   */
  function diffDays(dateA, dateB) {
    const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), 12);
    const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), 12);
    return Math.round((b - a) / 86400000);
  }

  /**
   * Builds a map of YYYY-MM-DD -> count of learning entries.
   * @param {Array} learningEntries
   * @returns {Object<string, number>}
   */
  function buildActivityMap(learningEntries) {
    const map = {};
    (learningEntries || []).forEach((entry) => {
      if (entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        map[entry.date] = (map[entry.date] || 0) + 1;
      }
    });
    return map;
  }

  /**
   * Maps an entry count to a 0–4 intensity level for the contribution heatmap.
   * @param {number} count
   * @returns {number}
   */
  function getIntensityLevel(count) {
    if (!count || count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }

  /**
   * Calculates authentic streak statistics strictly from saved learning entries.
   * - Current Streak: Consecutive days with >= 1 entry ending today (or yesterday if today not yet logged).
   * - Longest Streak: Highest consecutive day run across all saved entries.
   * - Total Active Days: Total unique dates with >= 1 entry.
   * - Year Entries: Total entries recorded in the current calendar year.
   * @param {Array} learningEntries
   * @returns {{ currentStreak: number, longestStreak: number, totalActiveDays: number, yearEntries: number, activeToday: boolean, activityMap: Object }}
   */
  function calculateStats(learningEntries) {
    const activityMap = buildActivityMap(learningEntries);
    const today = new Date();
    const todayISO = formatISO(today);
    const currentYear = today.getFullYear();

    // Filter out future-dated entries from active streak counting while preserving them in storage
    const validDates = Object.keys(activityMap)
      .filter((iso) => iso <= todayISO)
      .sort();

    const totalActiveDays = Object.keys(activityMap).length;
    const yearEntries = (learningEntries || []).filter((e) => e.date && e.date.startsWith(`${currentYear}-`)).length;
    const activeToday = Boolean(activityMap[todayISO]);

    if (validDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays,
        yearEntries,
        activeToday: false,
        activityMap
      };
    }

    // Compute longest streak across all sorted unique dates
    let longestStreak = 1;
    let runningStreak = 1;
    for (let i = 1; i < validDates.length; i++) {
      const prev = parseLocalDate(validDates[i - 1]);
      const curr = parseLocalDate(validDates[i]);
      if (prev && curr && diffDays(prev, curr) === 1) {
        runningStreak += 1;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 1;
      }
    }

    // Compute current streak ending today or yesterday
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yesterdayISO = formatISO(yesterday);
    let currentStreak = 0;

    let cursor = null;
    if (activityMap[todayISO]) {
      cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (activityMap[yesterdayISO]) {
      cursor = yesterday;
    }

    while (cursor) {
      const key = formatISO(cursor);
      if (activityMap[key]) {
        currentStreak += 1;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalActiveDays,
      yearEntries,
      activeToday,
      activityMap
    };
  }

  /**
   * Generates a 53-week x 7-day grid covering Jan 1 – Dec 31 of the current year.
   * @param {Array} learningEntries
   * @param {number} [year]
   * @returns {{ year: number, weeks: Array, monthPositions: Array }}
   */
  function buildYearCalendar(learningEntries, year) {
    const targetYear = year || new Date().getFullYear();
    const activityMap = buildActivityMap(learningEntries);
    const todayISO = formatISO(new Date());

    const jan1 = new Date(targetYear, 0, 1);
    const dec31 = new Date(targetYear, 11, 31);

    // Start grid on the Sunday on or before Jan 1
    const start = new Date(jan1);
    start.setDate(jan1.getDate() - jan1.getDay());

    // End grid on the Saturday on or after Dec 31
    const end = new Date(dec31);
    end.setDate(dec31.getDate() + (6 - dec31.getDay()));

    const weeks = [];
    const monthPositions = [];
    let lastLabeledMonth = -1;

    const cursor = new Date(start);
    let weekIndex = 0;

    while (cursor <= end) {
      const week = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const iso = formatISO(cursor);
        const inYear = cursor.getFullYear() === targetYear;
        const count = inYear ? activityMap[iso] || 0 : 0;

        if (inYear && cursor.getDate() <= 7 && cursor.getMonth() !== lastLabeledMonth) {
          monthPositions.push({
            weekIndex,
            label: MONTH_LABELS[cursor.getMonth()]
          });
          lastLabeledMonth = cursor.getMonth();
        }

        week.push({
          iso,
          inYear,
          count,
          level: inYear ? getIntensityLevel(count) : 0,
          isToday: iso === todayISO,
          displayDate: formatDisplayDate(iso)
        });

        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      weekIndex += 1;
    }

    return { year: targetYear, weeks, monthPositions };
  }

  /**
   * Computes counts of entries, bugs, snippets, and commands added in the current 7-day window.
   * @param {{ learning: Array, bugs: Array, snippets: Array, commands: Array }} state
   * @returns {{ learning: number, bugs: number, snippets: number, commands: number, total: number, rangeLabel: string }}
   */
  function calculateWeeklySummary(state) {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const startISO = formatISO(startOfWeek);
    const endISO = formatISO(today);

    const inWindowByDate = (isoDate) => typeof isoDate === 'string' && isoDate >= startISO && isoDate <= endISO;
    const inWindowByTimestamp = (isoTs) => {
      if (!isoTs) return false;
      const d = new Date(isoTs);
      if (Number.isNaN(d.getTime())) return false;
      const localISO = formatISO(d);
      return localISO >= startISO && localISO <= endISO;
    };

    const learning = (state.learning || []).filter((e) => inWindowByDate(e.date)).length;
    const bugs = (state.bugs || []).filter((b) => (b.date ? inWindowByDate(b.date) : inWindowByTimestamp(b.createdAt))).length;
    const snippets = (state.snippets || []).filter((s) => inWindowByTimestamp(s.createdAt)).length;
    const commands = (state.commands || []).filter((c) => inWindowByTimestamp(c.createdAt)).length;

    return {
      learning,
      bugs,
      snippets,
      commands,
      total: learning + bugs + snippets + commands,
      rangeLabel: `${formatDisplayDate(startISO)} – ${formatDisplayDate(endISO)}`
    };
  }

  global.CodeCrumb = global.CodeCrumb || {};
  global.CodeCrumb.Streak = {
    parseLocalDate,
    formatISO,
    formatDisplayDate,
    buildActivityMap,
    getIntensityLevel,
    calculateStats,
    buildYearCalendar,
    calculateWeeklySummary
  };
})(window);
