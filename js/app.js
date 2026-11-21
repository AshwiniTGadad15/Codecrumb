/**
 * CodeCrumb – Main Application Controller (app.js)
 * Coordinates routing, DOM rendering, form validation, CRUD workflows,
 * search & filtering, interactive streak calendar, and toast notifications.
 */

(function (global) {
  'use strict';

  const Storage = global.CodeCrumb.Storage;
  const Streak = global.CodeCrumb.Streak;
  const Features = global.CodeCrumb.Features;
  const escapeHTML = Features.escapeHTML;

  const VIEW_LABELS = {
    dashboard: 'Dashboard',
    learning: 'Daily Learning',
    bugs: 'Bug Diary',
    snippets: 'Code Snippets',
    commands: 'Useful Commands',
    streak: 'Learning Streak',
    settings: 'Settings'
  };

  const appState = {
    activeView: 'dashboard',
    quoteOffset: 0,
    currentRecallId: null,
    selectedCalendarDate: null,
    commandCategoryFilter: 'All',
    editingGoal: false,
    confirmCallback: null
  };

  /* ========================================================================
     DOM Helpers, Icons & Notifications
     ======================================================================== */

  function $(id) {
    return document.getElementById(id);
  }

  function refreshIcons() {
    if (global.lucide && typeof global.lucide.createIcons === 'function') {
      global.lucide.createIcons();
    }
  }

  /**
   * Displays a non-blocking toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'} [type='success']
   */
  function showToast(message, type) {
    const kind = type || 'success';
    const container = $('toastContainer');
    if (!container) return;

    const iconName = kind === 'error' ? 'alert-circle' : kind === 'info' ? 'info' : 'check-circle-2';
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<i data-lucide="${iconName}"></i><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  /**
   * Opens the accessible confirmation modal (replaces window.confirm).
   */
  function openConfirmModal(title, message, confirmLabel, onConfirm, isDanger) {
    $('confirmModalTitle').textContent = title;
    $('confirmModalMessage').textContent = message;
    const okBtn = $('confirmModalOk');
    okBtn.textContent = confirmLabel || 'Confirm';
    okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    appState.confirmCallback = onConfirm;
    $('confirmModal').classList.add('open');
    okBtn.focus();
  }

  function closeConfirmModal() {
    $('confirmModal').classList.remove('open');
    appState.confirmCallback = null;
  }

  /**
   * Populates language <select> elements consistently.
   */
  function populateSelectOptions() {
    const langSelects = ['learningLanguage', 'bugLanguage', 'snippetLanguage'];
    langSelects.forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = Features.LANGUAGES.map(
        (lang) => `<option value="${escapeHTML(lang)}">${escapeHTML(lang)}</option>`
      ).join('');
    });

    const filterSelects = ['learningLangFilter', 'bugLangFilter', 'snippetLangFilter'];
    filterSelects.forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.innerHTML =
        '<option value="All">All Languages</option>' +
        Features.LANGUAGES.map((lang) => `<option value="${escapeHTML(lang)}">${escapeHTML(lang)}</option>`).join('');
    });

    const cmdCatSelect = $('commandCategory');
    if (cmdCatSelect) {
      cmdCatSelect.innerHTML = Features.COMMAND_CATEGORIES.map(
        (cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`
      ).join('');
    }
  }

  /* ========================================================================
     Theme & Navigation
     ======================================================================== */

  function applyTheme(theme) {
    const chosen = theme || 'navy';
    if (chosen === 'navy') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', chosen);
    }

    document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeChoice === chosen);
    });
  }

  function closeMobileSidebar() {
    $('sidebar').classList.remove('open');
    $('sidebarBackdrop').classList.remove('open');
  }

  function navigateTo(view, options) {
    if (!VIEW_LABELS[view]) return;
    appState.activeView = view;

    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${view}`);
    });

    document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
      const isCurrent = btn.dataset.view === view;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    $('breadcrumbCurrent').textContent = VIEW_LABELS[view];
    closeMobileSidebar();

    if (options && options.openForm) {
      openSectionForm(view);
    }

    if (options && options.searchQuery) {
      const searchInputMap = {
        learning: 'learningSearch',
        bugs: 'bugSearch',
        snippets: 'snippetSearch',
        commands: 'commandSearch'
      };
      const targetSearch = $(searchInputMap[view]);
      if (targetSearch) {
        targetSearch.value = options.searchQuery;
      }
    }

    renderActiveView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSectionForm(view) {
    if (view === 'learning') {
      resetLearningForm();
      $('learningFormPanel').classList.remove('collapsed');
      setTimeout(() => $('learningTitle').focus(), 40);
    } else if (view === 'bugs') {
      resetBugForm();
      $('bugFormPanel').classList.remove('collapsed');
      setTimeout(() => $('bugTitle').focus(), 40);
    } else if (view === 'snippets') {
      resetSnippetForm();
      $('snippetFormPanel').classList.remove('collapsed');
      setTimeout(() => $('snippetTitle').focus(), 40);
    } else if (view === 'commands') {
      resetCommandForm();
      $('commandFormPanel').classList.remove('collapsed');
      setTimeout(() => $('commandTitle').focus(), 40);
    }
  }

  /* ========================================================================
     Master Render Orchestration
     ======================================================================== */

  function renderAllChrome() {
    const state = Storage.getState();
    const stats = Streak.calculateStats(state.learning);

    $('navCountLearning').textContent = state.learning.length;
    $('navCountBugs').textContent = state.bugs.length;
    $('navCountSnippets').textContent = state.snippets.length;
    $('navCountCommands').textContent = state.commands.length;
    $('sidebarStreakValue').textContent = `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`;
  }

  function renderActiveView() {
    renderAllChrome();
    switch (appState.activeView) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'learning':
        renderLearningList();
        break;
      case 'bugs':
        renderBugList();
        break;
      case 'snippets':
        renderSnippetList();
        break;
      case 'commands':
        renderCommandList();
        break;
      case 'streak':
        renderStreakView();
        break;
      case 'settings':
        renderSettingsView();
        break;
      default:
        renderDashboard();
    }
    refreshIcons();
  }

  /* ========================================================================
     A. Dashboard View
     ======================================================================== */

  function renderDashboard() {
    const state = Storage.getState();
    const streakStats = Streak.calculateStats(state.learning);
    const weekly = Streak.calculateWeeklySummary(state);

    // Welcome heading & date
    const name = state.settings.userName || 'Developer';
    $('welcomeHeading').textContent = `Welcome back, ${name}!`;
    $('welcomeDateSub').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // KPI Cards
    $('kpiLearning').textContent = state.learning.length;
    $('kpiBugs').textContent = state.bugs.length;
    $('kpiSnippets').textContent = state.snippets.length;
    $('kpiStreak').textContent = streakStats.currentStreak;
    $('kpiStreakNote').textContent = streakStats.activeToday
      ? 'Logged today · Streak active'
      : streakStats.currentStreak > 0
      ? 'Log an entry today to extend streak'
      : 'Log an entry to start your streak';

    // Today's Coding Goal
    renderTodayGoal();

    // Developer Quote of the Day
    const quote = Features.getQuoteOfTheDay(appState.quoteOffset);
    $('quoteText').textContent = `“${quote.text}”`;
    $('quoteAuthor').textContent = `— ${quote.author}`;

    // Weekly Learning Summary
    $('weeklyRangeLabel').textContent = weekly.rangeLabel;
    const maxVal = Math.max(weekly.learning, weekly.bugs, weekly.snippets, weekly.commands, 1);
    const rows = [
      { label: 'Learning Entries', count: weekly.learning },
      { label: 'Bugs Documented', count: weekly.bugs },
      { label: 'Code Snippets', count: weekly.snippets },
      { label: 'Useful Commands', count: weekly.commands }
    ];
    $('weeklySummaryBody').innerHTML = rows
      .map((row) => {
        const pct = row.count === 0 ? 0 : Math.max(8, Math.round((row.count / maxVal) * 100));
        return `
          <div class="weekly-row">
            <div class="weekly-row-top">
              <span class="weekly-row-label">${escapeHTML(row.label)}</span>
              <span class="weekly-row-count">${row.count}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');

    // Random Knowledge Recall
    renderKnowledgeRecall(false);

    // Recent Activities
    const recent = Features.getRecentActivities(state, 6);
    const listEl = $('recentActivityList');
    if (recent.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
          <h3 class="empty-state-title">No recent activity yet</h3>
          <p class="empty-state-desc">Start by logging something you learned today, documenting a solved bug, or saving a reusable code snippet.</p>
          <button type="button" class="btn btn-primary btn-sm" data-quick-add="learning">
            <i data-lucide="plus"></i>
            Log First Entry
          </button>
        </div>
      `;
    } else {
      listEl.innerHTML = recent
        .map(
          (item) => `
          <div class="activity-item">
            <div class="activity-main">
              <button type="button" class="activity-title-btn" data-jump-view="${escapeHTML(item.view)}" data-jump-query="${escapeHTML(item.title)}">
                ${escapeHTML(item.title)}
              </button>
              <div class="meta-line">
                <span class="meta-accent">${escapeHTML(item.kind)}</span>
                <span class="meta-sep" aria-hidden="true">·</span>
                <span>${escapeHTML(item.subtitle)}</span>
              </div>
            </div>
            <span class="activity-date">${escapeHTML(Streak.formatDisplayDate(item.date))}</span>
          </div>
        `
        )
        .join('');
    }
  }

  function renderTodayGoal() {
    const goal = Storage.getTodayGoal();
    const form = $('goalForm');
    const display = $('goalDisplay');
    const input = $('goalInput');

    if (!goal || appState.editingGoal) {
      form.style.display = 'flex';
      display.style.display = 'none';
      input.value = goal ? goal.text : '';
    } else {
      form.style.display = 'none';
      display.style.display = 'flex';
      $('goalCheckbox').checked = Boolean(goal.completed);
      $('goalText').textContent = goal.text;
      $('goalText').classList.toggle('completed', Boolean(goal.completed));
      $('goalStatusText').textContent = goal.completed ? 'Completed' : 'In progress';
      $('goalStatusText').style.color = goal.completed ? 'var(--status-success)' : 'var(--text-muted)';
    }
  }

  function renderKnowledgeRecall(forceNew) {
    const entries = Storage.getLearningEntries();
    const container = $('recallContainer');

    if (entries.length === 0) {
      appState.currentRecallId = null;
      container.innerHTML = `
        <p class="page-subtitle" style="margin-top:0;">Save at least one daily learning entry to unlock spaced revision recall cards here.</p>
      `;
      return;
    }

    let selected = entries.find((e) => e.id === appState.currentRecallId);
    if (!selected || forceNew) {
      selected = Features.pickRandomRecall(entries, forceNew ? appState.currentRecallId : null);
      appState.currentRecallId = selected ? selected.id : null;
    }

    if (!selected) return;

    const previewText = selected.content.length > 260 ? `${selected.content.slice(0, 260).trim()}…` : selected.content;

    container.innerHTML = `
      <div class="meta-line" style="margin-bottom:8px;">
        <span class="meta-accent">${escapeHTML(selected.language)}</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <span class="mono">${escapeHTML(Streak.formatDisplayDate(selected.date))}</span>
      </div>
      <h3 class="recall-title">${escapeHTML(selected.title)}</h3>
      <p class="recall-body">${escapeHTML(previewText)}</p>
      <button type="button" class="btn btn-secondary btn-sm" data-jump-view="learning" data-jump-query="${escapeHTML(selected.title)}">
        <i data-lucide="book-open"></i>
        Review in Journal
      </button>
    `;
  }

  /* ========================================================================
     B. Daily Learning Journal View
     ======================================================================== */

  function resetLearningForm() {
    $('learningForm').reset();
    $('learningEditId').value = '';
    $('learningDate').value = Storage.toLocalISODate(new Date());
    $('learningFormTitle').textContent = 'Add Daily Learning Entry';
    $('saveLearningBtn').textContent = 'Save Entry';
    $('learningFormError').textContent = '';
  }

  function renderLearningList() {
    const entries = Storage.getLearningEntries();
    const query = ($('learningSearch').value || '').trim().toLowerCase();
    const langFilter = $('learningLangFilter').value || 'All';
    const sortOrder = $('learningSortFilter').value || 'newest';

    let filtered = entries.filter((item) => {
      const matchesLang = langFilter === 'All' || item.language === langFilter;
      const matchesQuery =
        !query ||
        `${item.title} ${item.language} ${item.content} ${item.date}`.toLowerCase().includes(query);
      return matchesLang && matchesQuery;
    });

    if (sortOrder === 'oldest') {
      filtered = [...filtered].reverse();
    }

    const container = $('learningList');

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="book-open"></i></div>
          <h3 class="empty-state-title">Your learning journal is empty</h3>
          <p class="empty-state-desc">Capture concepts, architecture insights, or subtle language behaviors you picked up today. Every logged day builds your real streak.</p>
          <button type="button" class="btn btn-primary" data-open-form="learning">
            <i data-lucide="plus"></i>
            Log First Learning Entry
          </button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="search-x"></i></div>
          <h3 class="empty-state-title">No matching learning entries</h3>
          <p class="empty-state-desc">Try adjusting your search keywords or switching the language filter back to All Languages.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-clear-filters="learning">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (entry) => `
        <article class="card card-interactive entry-card">
          <div class="entry-top">
            <div>
              <h3 class="entry-title">${escapeHTML(entry.title)}</h3>
              <div class="meta-line" style="margin-top:4px;">
                <span class="meta-accent">${escapeHTML(entry.language)}</span>
                <span class="meta-sep" aria-hidden="true">·</span>
                <span class="mono">${escapeHTML(Streak.formatDisplayDate(entry.date))}</span>
              </div>
            </div>
            <div class="entry-actions">
              <button type="button" class="btn-icon" data-edit-learning="${escapeHTML(entry.id)}" title="Edit entry" aria-label="Edit entry">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="btn-icon danger" data-delete-learning="${escapeHTML(entry.id)}" title="Delete entry" aria-label="Delete entry">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <p class="entry-body">${escapeHTML(entry.content)}</p>
        </article>
      `
      )
      .join('');
  }

  /* ========================================================================
     C. Bug Diary View
     ======================================================================== */

  function resetBugForm() {
    $('bugForm').reset();
    $('bugEditId').value = '';
    $('bugDate').value = Storage.toLocalISODate(new Date());
    $('bugFormTitle').textContent = 'Document a Bug & Solution';
    $('saveBugBtn').textContent = 'Save Bug Record';
    $('bugFormError').textContent = '';
  }

  function renderBugList() {
    const bugs = Storage.getBugs();
    const query = ($('bugSearch').value || '').trim().toLowerCase();
    const langFilter = $('bugLangFilter').value || 'All';

    const filtered = bugs.filter((item) => {
      const matchesLang = langFilter === 'All' || item.language === langFilter;
      const matchesQuery =
        !query || `${item.title} ${item.language} ${item.error} ${item.solution}`.toLowerCase().includes(query);
      return matchesLang && matchesQuery;
    });

    const container = $('bugList');

    if (bugs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="bug"></i></div>
          <h3 class="empty-state-title">No bugs documented yet</h3>
          <p class="empty-state-desc">Save tricky error messages alongside the exact root-cause fix so you never waste hours debugging the same issue twice.</p>
          <button type="button" class="btn btn-primary" data-open-form="bugs">
            <i data-lucide="plus"></i>
            Record First Bug
          </button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="search-x"></i></div>
          <h3 class="empty-state-title">No matching bug records</h3>
          <p class="empty-state-desc">No bugs match your current search or language selection.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-clear-filters="bugs">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (bug) => `
        <article class="card card-interactive entry-card">
          <div class="entry-top">
            <div>
              <h3 class="entry-title">${escapeHTML(bug.title)}</h3>
              <div class="meta-line" style="margin-top:4px;">
                <span class="meta-accent">${escapeHTML(bug.language)}</span>
                <span class="meta-sep" aria-hidden="true">·</span>
                <span class="mono">${escapeHTML(Streak.formatDisplayDate(bug.date || (bug.createdAt || '').slice(0, 10)))}</span>
              </div>
            </div>
            <div class="entry-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-copy-bug="${escapeHTML(bug.id)}">
                <i data-lucide="copy"></i>
                Copy Fix
              </button>
              <button type="button" class="btn-icon" data-edit-bug="${escapeHTML(bug.id)}" title="Edit bug" aria-label="Edit bug">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="btn-icon danger" data-delete-bug="${escapeHTML(bug.id)}" title="Delete bug" aria-label="Delete bug">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <div class="bug-blocks">
            <div>
              <span class="bug-block-label error">Error Encountered</span>
              <p class="bug-block-text">${escapeHTML(bug.error)}</p>
            </div>
            <div>
              <span class="bug-block-label solution">Verified Solution</span>
              <p class="bug-block-text">${escapeHTML(bug.solution)}</p>
            </div>
          </div>
        </article>
      `
      )
      .join('');
  }

  /* ========================================================================
     D. Code Snippet Library View
     ======================================================================== */

  function resetSnippetForm() {
    $('snippetForm').reset();
    $('snippetEditId').value = '';
    $('snippetFormTitle').textContent = 'Save Code Snippet';
    $('saveSnippetBtn').textContent = 'Save Snippet';
    $('snippetFormError').textContent = '';
  }

  function renderSnippetList() {
    const snippets = Storage.getSnippets();
    const query = ($('snippetSearch').value || '').trim().toLowerCase();
    const langFilter = $('snippetLangFilter').value || 'All';

    const filtered = snippets.filter((item) => {
      const matchesLang = langFilter === 'All' || item.language === langFilter;
      const matchesQuery =
        !query || `${item.title} ${item.language} ${item.description} ${item.code}`.toLowerCase().includes(query);
      return matchesLang && matchesQuery;
    });

    const container = $('snippetList');

    if (snippets.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i data-lucide="code-2"></i></div>
          <h3 class="empty-state-title">No code snippets saved yet</h3>
          <p class="empty-state-desc">Store clean utilities, hooks, SQL queries, and CSS patterns you reach for frequently, ready to copy in a single click.</p>
          <button type="button" class="btn btn-primary" data-open-form="snippets">
            <i data-lucide="plus"></i>
            Save First Snippet
          </button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i data-lucide="search-x"></i></div>
          <h3 class="empty-state-title">No matching snippets</h3>
          <p class="empty-state-desc">Try clearing the search query or selecting All Languages.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-clear-filters="snippets">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((snippet) => {
        const lineCount = snippet.code.split('\n').length;
        return `
          <article class="card card-interactive entry-card">
            <div class="entry-top">
              <div>
                <h3 class="entry-title">${escapeHTML(snippet.title)}</h3>
                <div class="meta-line" style="margin-top:4px;">
                  <span class="meta-accent">${escapeHTML(snippet.language)}</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span class="mono">${lineCount} ${lineCount === 1 ? 'line' : 'lines'}</span>
                </div>
              </div>
              <div class="entry-actions">
                <button type="button" class="btn-icon" data-edit-snippet="${escapeHTML(snippet.id)}" title="Edit snippet" aria-label="Edit snippet">
                  <i data-lucide="pencil"></i>
                </button>
                <button type="button" class="btn-icon danger" data-delete-snippet="${escapeHTML(snippet.id)}" title="Delete snippet" aria-label="Delete snippet">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
            <p class="entry-body">${escapeHTML(snippet.description)}</p>
            <div class="code-block-wrap">
              <div class="code-block-header">
                <span class="mono">${escapeHTML(snippet.language)}</span>
                <button type="button" class="btn btn-ghost btn-sm" data-copy-snippet="${escapeHTML(snippet.id)}" style="color:#cbd5e1;">
                  <i data-lucide="copy"></i>
                  Copy Code
                </button>
              </div>
              <pre class="code-block-pre"><code>${escapeHTML(snippet.code)}</code></pre>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /* ========================================================================
     E. Useful Commands View
     ======================================================================== */

  function resetCommandForm() {
    $('commandForm').reset();
    $('commandEditId').value = '';
    $('commandFormTitle').textContent = 'Add Useful Command or Tip';
    $('saveCommandBtn').textContent = 'Save Command';
    $('commandFormError').textContent = '';
  }

  function renderCommandList() {
    const commands = Storage.getCommands();
    const query = ($('commandSearch').value || '').trim().toLowerCase();
    const catFilter = appState.commandCategoryFilter;

    document.querySelectorAll('#commandCategoryTabs .segmented-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === catFilter);
    });

    const filtered = commands.filter((item) => {
      const matchesCat = catFilter === 'All' || item.category === catFilter;
      const matchesQuery =
        !query || `${item.title} ${item.category} ${item.command} ${item.notes || ''}`.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });

    const container = $('commandList');

    if (commands.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="terminal"></i></div>
          <h3 class="empty-state-title">No commands saved yet</h3>
          <p class="empty-state-desc">Keep your go-to Git workflows, terminal one-liners, VS Code shortcuts, and engineering tips one click away.</p>
          <button type="button" class="btn btn-primary" data-open-form="commands">
            <i data-lucide="plus"></i>
            Add First Command
          </button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="search-x"></i></div>
          <h3 class="empty-state-title">No matching commands</h3>
          <p class="empty-state-desc">Try searching another keyword or viewing All categories.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-clear-filters="commands">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map(
        (cmd) => `
        <article class="card card-interactive command-row">
          <div class="entry-top">
            <div>
              <h3 class="entry-title">${escapeHTML(cmd.title)}</h3>
              <div class="meta-line" style="margin-top:4px;">
                <span class="meta-accent">${escapeHTML(cmd.category)}</span>
              </div>
            </div>
            <div class="entry-actions">
              <button type="button" class="btn-icon" data-edit-command="${escapeHTML(cmd.id)}" title="Edit command" aria-label="Edit command">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="btn-icon danger" data-delete-command="${escapeHTML(cmd.id)}" title="Delete command" aria-label="Delete command">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <div class="command-code-line">
            <code>${escapeHTML(cmd.command)}</code>
            <button type="button" class="btn btn-secondary btn-sm" data-copy-command="${escapeHTML(cmd.id)}">
              <i data-lucide="copy"></i>
              Copy
            </button>
          </div>
          ${cmd.notes ? `<p class="entry-body">${escapeHTML(cmd.notes)}</p>` : ''}
        </article>
      `
      )
      .join('');
  }

  /* ========================================================================
     F. Learning Streak Calendar & Achievement Badges View
     ======================================================================== */

  function renderStreakView() {
    const state = Storage.getState();
    const stats = Streak.calculateStats(state.learning);
    const calendar = Streak.buildYearCalendar(state.learning);

    $('streakCurrentVal').textContent = stats.currentStreak;
    $('streakLongestVal').textContent = stats.longestStreak;
    $('streakActiveDaysVal').textContent = stats.totalActiveDays;
    $('streakYearTotalVal').textContent = stats.yearEntries;
    $('calendarYearHeading').textContent = `${calendar.year} Learning Activity`;

    // Render month header grid aligned with week columns
    const monthsEl = $('calendarMonths');
    monthsEl.style.gridTemplateColumns = `32px repeat(${calendar.weeks.length}, 13px)`;
    const monthCells = ['<span></span>'];
    const posMap = {};
    calendar.monthPositions.forEach((m) => {
      posMap[m.weekIndex] = m.label;
    });
    for (let w = 0; w < calendar.weeks.length; w++) {
      monthCells.push(`<span>${posMap[w] ? escapeHTML(posMap[w]) : ''}</span>`);
    }
    monthsEl.innerHTML = monthCells.join('');

    // Render week x day cells
    const weeksEl = $('calendarWeeks');
    const cellsHtml = [];
    calendar.weeks.forEach((week) => {
      week.forEach((day) => {
        if (!day.inYear) {
          cellsHtml.push('<span class="cal-cell outside" aria-hidden="true"></span>');
          return;
        }
        const selectedClass = appState.selectedCalendarDate === day.iso ? 'selected' : '';
        const todayClass = day.isToday ? 'today' : '';
        const label = `${day.displayDate}: ${day.count} ${day.count === 1 ? 'learning entry' : 'learning entries'}`;
        cellsHtml.push(
          `<button type="button" class="cal-cell ${todayClass} ${selectedClass}" data-date="${day.iso}" data-count="${day.count}" data-display="${escapeHTML(day.displayDate)}" data-level="${day.level}" aria-label="${escapeHTML(label)}"></button>`
        );
      });
    });
    weeksEl.innerHTML = cellsHtml.join('');

    renderDayInspector();

    // Render Achievement Badges
    const badges = Features.evaluateBadges(state, stats);
    const unlockedCount = badges.filter((b) => b.unlocked).length;
    $('badgesSummaryText').textContent = `${unlockedCount} of ${badges.length} badges unlocked`;

    $('badgesGrid').innerHTML = badges
      .map((badge) => {
        const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));
        return `
          <article class="card badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
            <div class="badge-header">
              <div class="badge-icon-wrap">
                <i data-lucide="${escapeHTML(badge.icon)}"></i>
              </div>
              <span class="badge-status">${badge.unlocked ? 'Unlocked' : 'Locked'}</span>
            </div>
            <h3 class="badge-name">${escapeHTML(badge.name)}</h3>
            <p class="badge-desc">${escapeHTML(badge.description)}</p>
            <div style="margin-top:auto;">
              <div class="weekly-row-top" style="margin-bottom:5px;">
                <span class="badge-progress-text">${badge.current} / ${badge.target} ${escapeHTML(badge.unit)}</span>
                <span class="badge-progress-text">${pct}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderDayInspector() {
    const inspector = $('dayInspector');
    const selectedDate = appState.selectedCalendarDate;
    if (!selectedDate) {
      inspector.innerHTML =
        '<p class="page-subtitle" style="margin:0;">Click any day cell in the contribution calendar above to inspect entries logged on that date.</p>';
      return;
    }

    const entries = Storage.getLearningEntries().filter((e) => e.date === selectedDate);
    const niceDate = Streak.formatDisplayDate(selectedDate);

    if (entries.length === 0) {
      inspector.innerHTML = `
        <div class="card-header" style="margin-bottom:8px;">
          <h3 class="section-heading">${escapeHTML(niceDate)}</h3>
          <button type="button" class="btn btn-primary btn-sm" data-log-for-date="${escapeHTML(selectedDate)}">
            <i data-lucide="plus"></i>
            Log Entry for This Day
          </button>
        </div>
        <p class="page-subtitle" style="margin:0;">No learning entries recorded on this date yet.</p>
      `;
      return;
    }

    inspector.innerHTML = `
      <div class="card-header" style="margin-bottom:10px;">
        <h3 class="section-heading">${escapeHTML(niceDate)} · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</h3>
        <button type="button" class="btn btn-secondary btn-sm" data-log-for-date="${escapeHTML(selectedDate)}">
          <i data-lucide="plus"></i>
          Add Another
        </button>
      </div>
      <div class="activity-list">
        ${entries
          .map(
            (e) => `
          <div class="activity-item">
            <div class="activity-main">
              <button type="button" class="activity-title-btn" data-jump-view="learning" data-jump-query="${escapeHTML(e.title)}">${escapeHTML(e.title)}</button>
              <div class="meta-line">
                <span class="meta-accent">${escapeHTML(e.language)}</span>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /* ========================================================================
     G. Settings View
     ======================================================================== */

  function renderSettingsView() {
    const settings = Storage.getSettings();
    $('settingsUserName').value = settings.userName;
    applyTheme(settings.theme);
  }

  /* ========================================================================
     Event Wiring
     ======================================================================== */

  function bindGlobalEvents() {
    // Sidebar navigation
    $('navList').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item[data-view]');
      if (!btn) return;
      navigateTo(btn.dataset.view);
    });

    // Mobile sidebar toggle
    $('mobileMenuBtn').addEventListener('click', () => {
      $('sidebar').classList.toggle('open');
      $('sidebarBackdrop').classList.toggle('open');
    });
    $('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

    // Top bar primary CTA
    $('topbarQuickAddBtn').addEventListener('click', () => {
      navigateTo('learning', { openForm: true });
    });

    // Global Search
    const searchInput = $('globalSearchInput');
    const dropdown = $('globalSearchDropdown');

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      if (!q) {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        return;
      }
      const matches = Features.globalSearch(Storage.getState(), q);
      if (matches.length === 0) {
        dropdown.innerHTML = `<div class="search-empty">No results found for “${escapeHTML(q)}”.</div>`;
      } else {
        dropdown.innerHTML = matches
          .map(
            (m) => `
            <button type="button" class="search-result-item" data-jump-view="${escapeHTML(m.view)}" data-jump-query="${escapeHTML(m.title)}">
              <span class="search-result-title">${escapeHTML(m.title)}</span>
              <span class="search-result-meta">${escapeHTML(m.typeLabel)} · ${escapeHTML(m.meta)}</span>
            </button>
          `
          )
          .join('');
      }
      dropdown.classList.add('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-search-wrap')) {
        dropdown.classList.remove('open');
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeConfirmModal();
        closeMobileSidebar();
        dropdown.classList.remove('open');
      } else if (
        e.key === '/' &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Confirm Modal
    $('confirmModalCancel').addEventListener('click', closeConfirmModal);
    $('confirmModal').addEventListener('click', (e) => {
      if (e.target === $('confirmModal')) closeConfirmModal();
    });
    $('confirmModalOk').addEventListener('click', () => {
      const cb = appState.confirmCallback;
      closeConfirmModal();
      if (typeof cb === 'function') cb();
    });

    // Tab indentation inside code editor textarea
    $('snippetCode').addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.target;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
        el.selectionStart = el.selectionEnd = start + 2;
      }
    });

    // Delegated clicks across main workspace
    document.addEventListener('click', async (e) => {
      // Quick add buttons
      const quickBtn = e.target.closest('[data-quick-add]');
      if (quickBtn) {
        navigateTo(quickBtn.dataset.quickAdd, { openForm: true });
        return;
      }

      // Open form buttons from empty states
      const openFormBtn = e.target.closest('[data-open-form]');
      if (openFormBtn) {
        openSectionForm(openFormBtn.dataset.openForm);
        return;
      }

      // Jump from global search, recent activity, recall, or day inspector
      const jumpBtn = e.target.closest('[data-jump-view]');
      if (jumpBtn) {
        dropdown.classList.remove('open');
        searchInput.value = '';
        navigateTo(jumpBtn.dataset.jumpView, { searchQuery: jumpBtn.dataset.jumpQuery || '' });
        return;
      }

      // Clear section filters
      const clearFiltersBtn = e.target.closest('[data-clear-filters]');
      if (clearFiltersBtn) {
        const sec = clearFiltersBtn.dataset.clearFilters;
        if (sec === 'learning') {
          $('learningSearch').value = '';
          $('learningLangFilter').value = 'All';
          $('learningSortFilter').value = 'newest';
          renderLearningList();
        } else if (sec === 'bugs') {
          $('bugSearch').value = '';
          $('bugLangFilter').value = 'All';
          renderBugList();
        } else if (sec === 'snippets') {
          $('snippetSearch').value = '';
          $('snippetLangFilter').value = 'All';
          renderSnippetList();
        } else if (sec === 'commands') {
          $('commandSearch').value = '';
          appState.commandCategoryFilter = 'All';
          renderCommandList();
        }
        refreshIcons();
        return;
      }

      // Log learning entry for a specific calendar date
      const logDateBtn = e.target.closest('[data-log-for-date]');
      if (logDateBtn) {
        const targetDate = logDateBtn.dataset.logForDate;
        navigateTo('learning', { openForm: true });
        $('learningDate').value = targetDate;
        return;
      }

      // Edit / Delete Learning
      const editLearn = e.target.closest('[data-edit-learning]');
      if (editLearn) {
        const item = Storage.getLearningEntries().find((x) => x.id === editLearn.dataset.editLearning);
        if (!item) return;
        $('learningEditId').value = item.id;
        $('learningTitle').value = item.title;
        $('learningLanguage').value = item.language;
        $('learningDate').value = item.date;
        $('learningContent').value = item.content;
        $('learningFormTitle').textContent = 'Edit Learning Entry';
        $('saveLearningBtn').textContent = 'Update Entry';
        $('learningFormError').textContent = '';
        $('learningFormPanel').classList.remove('collapsed');
        $('learningFormPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('learningTitle').focus();
        return;
      }

      const delLearn = e.target.closest('[data-delete-learning]');
      if (delLearn) {
        const id = delLearn.dataset.deleteLearning;
        openConfirmModal(
          'Delete learning entry?',
          'This entry will be removed from your journal and your learning streak will recalculate automatically.',
          'Delete Entry',
          () => {
            Storage.deleteLearningEntry(id);
            showToast('Learning entry deleted.', 'info');
            renderActiveView();
          },
          true
        );
        return;
      }

      // Copy / Edit / Delete Bug
      const copyBug = e.target.closest('[data-copy-bug]');
      if (copyBug) {
        const item = Storage.getBugs().find((x) => x.id === copyBug.dataset.copyBug);
        if (!item) return;
        const ok = await Features.copyToClipboard(item.solution);
        showToast(ok ? 'Bug solution copied to clipboard.' : 'Could not access clipboard.', ok ? 'success' : 'error');
        return;
      }

      const editBug = e.target.closest('[data-edit-bug]');
      if (editBug) {
        const item = Storage.getBugs().find((x) => x.id === editBug.dataset.editBug);
        if (!item) return;
        $('bugEditId').value = item.id;
        $('bugTitle').value = item.title;
        $('bugLanguage').value = item.language;
        $('bugDate').value = item.date || Storage.toLocalISODate(new Date());
        $('bugError').value = item.error;
        $('bugSolution').value = item.solution;
        $('bugFormTitle').textContent = 'Edit Bug Record';
        $('saveBugBtn').textContent = 'Update Bug Record';
        $('bugFormError').textContent = '';
        $('bugFormPanel').classList.remove('collapsed');
        $('bugFormPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('bugTitle').focus();
        return;
      }

      const delBug = e.target.closest('[data-delete-bug]');
      if (delBug) {
        const id = delBug.dataset.deleteBug;
        openConfirmModal(
          'Delete bug record?',
          'This bug and its documented solution will be permanently removed from LocalStorage.',
          'Delete Bug',
          () => {
            Storage.deleteBug(id);
            showToast('Bug record deleted.', 'info');
            renderActiveView();
          },
          true
        );
        return;
      }

      // Copy / Edit / Delete Snippet
      const copySnippet = e.target.closest('[data-copy-snippet]');
      if (copySnippet) {
        const item = Storage.getSnippets().find((x) => x.id === copySnippet.dataset.copySnippet);
        if (!item) return;
        const ok = await Features.copyToClipboard(item.code);
        if (ok) {
          const origHtml = copySnippet.innerHTML;
          copySnippet.innerHTML = '<i data-lucide="check"></i> Copied';
          refreshIcons();
          setTimeout(() => {
            copySnippet.innerHTML = origHtml;
            refreshIcons();
          }, 1400);
          showToast('Code snippet copied to clipboard.', 'success');
        } else {
          showToast('Unable to copy code to clipboard.', 'error');
        }
        return;
      }

      const editSnippet = e.target.closest('[data-edit-snippet]');
      if (editSnippet) {
        const item = Storage.getSnippets().find((x) => x.id === editSnippet.dataset.editSnippet);
        if (!item) return;
        $('snippetEditId').value = item.id;
        $('snippetTitle').value = item.title;
        $('snippetLanguage').value = item.language;
        $('snippetDescription').value = item.description;
        $('snippetCode').value = item.code;
        $('snippetFormTitle').textContent = 'Edit Code Snippet';
        $('saveSnippetBtn').textContent = 'Update Snippet';
        $('snippetFormError').textContent = '';
        $('snippetFormPanel').classList.remove('collapsed');
        $('snippetFormPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('snippetTitle').focus();
        return;
      }

      const delSnippet = e.target.closest('[data-delete-snippet]');
      if (delSnippet) {
        const id = delSnippet.dataset.deleteSnippet;
        openConfirmModal(
          'Delete code snippet?',
          'This snippet will be permanently removed from your Code Snippet Library.',
          'Delete Snippet',
          () => {
            Storage.deleteSnippet(id);
            showToast('Code snippet deleted.', 'info');
            renderActiveView();
          },
          true
        );
        return;
      }

      // Copy / Edit / Delete Command
      const copyCmd = e.target.closest('[data-copy-command]');
      if (copyCmd) {
        const item = Storage.getCommands().find((x) => x.id === copyCmd.dataset.copyCommand);
        if (!item) return;
        const ok = await Features.copyToClipboard(item.command);
        if (ok) {
          const origHtml = copyCmd.innerHTML;
          copyCmd.innerHTML = '<i data-lucide="check"></i> Copied';
          refreshIcons();
          setTimeout(() => {
            copyCmd.innerHTML = origHtml;
            refreshIcons();
          }, 1400);
          showToast('Command copied to clipboard.', 'success');
        } else {
          showToast('Unable to copy command.', 'error');
        }
        return;
      }

      const editCmd = e.target.closest('[data-edit-command]');
      if (editCmd) {
        const item = Storage.getCommands().find((x) => x.id === editCmd.dataset.editCommand);
        if (!item) return;
        $('commandEditId').value = item.id;
        $('commandTitle').value = item.title;
        $('commandCategory').value = item.category;
        $('commandValue').value = item.command;
        $('commandNotes').value = item.notes || '';
        $('commandFormTitle').textContent = 'Edit Command';
        $('saveCommandBtn').textContent = 'Update Command';
        $('commandFormError').textContent = '';
        $('commandFormPanel').classList.remove('collapsed');
        $('commandFormPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('commandTitle').focus();
        return;
      }

      const delCmd = e.target.closest('[data-delete-command]');
      if (delCmd) {
        const id = delCmd.dataset.deleteCommand;
        openConfirmModal(
          'Delete command?',
          'This command will be removed from your Useful Commands reference.',
          'Delete Command',
          () => {
            Storage.deleteCommand(id);
            showToast('Command deleted.', 'info');
            renderActiveView();
          },
          true
        );
      }
    });
  }

  function bindDashboardEvents() {
    // Today's Coding Goal
    $('goalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('goalInput').value.trim();
      if (!text) {
        showToast('Enter a coding goal for today first.', 'error');
        return;
      }
      const existing = Storage.getTodayGoal();
      Storage.saveTodayGoal(text, existing ? existing.completed : false);
      appState.editingGoal = false;
      renderTodayGoal();
      showToast("Today's coding goal saved.", 'success');
    });

    $('goalCheckbox').addEventListener('change', () => {
      const res = Storage.toggleTodayGoal();
      if (res.ok) {
        renderTodayGoal();
        showToast(res.goal.completed ? 'Daily coding goal completed!' : 'Goal marked in progress.', 'success');
      }
    });

    $('editGoalBtn').addEventListener('click', () => {
      appState.editingGoal = true;
      renderTodayGoal();
      $('goalInput').focus();
    });

    $('clearGoalBtn').addEventListener('click', () => {
      Storage.saveTodayGoal('', false);
      appState.editingGoal = false;
      renderTodayGoal();
      showToast("Cleared today's coding goal.", 'info');
    });

    // Quote Cycling
    $('nextQuoteBtn').addEventListener('click', () => {
      appState.quoteOffset += 1;
      const quote = Features.getQuoteOfTheDay(appState.quoteOffset);
      $('quoteText').textContent = `“${quote.text}”`;
      $('quoteAuthor').textContent = `— ${quote.author}`;
    });

    // Shuffle Knowledge Recall
    $('shuffleRecallBtn').addEventListener('click', () => {
      renderKnowledgeRecall(true);
      refreshIcons();
    });
  }

  function bindModuleFormsAndFilters() {
    // --- Daily Learning ---
    $('toggleLearningFormBtn').addEventListener('click', () => {
      const panel = $('learningFormPanel');
      if (panel.classList.contains('collapsed')) {
        resetLearningForm();
        panel.classList.remove('collapsed');
        $('learningTitle').focus();
      } else {
        panel.classList.add('collapsed');
      }
    });

    $('cancelLearningBtn').addEventListener('click', () => {
      resetLearningForm();
      $('learningFormPanel').classList.add('collapsed');
    });

    $('learningForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = $('learningEditId').value || null;
      const res = Storage.saveLearningEntry(
        {
          title: $('learningTitle').value,
          language: $('learningLanguage').value,
          date: $('learningDate').value,
          content: $('learningContent').value
        },
        editId
      );
      if (!res.ok) {
        $('learningFormError').textContent = res.error;
        showToast(res.error, 'error');
        return;
      }
      resetLearningForm();
      $('learningFormPanel').classList.add('collapsed');
      showToast(editId ? 'Learning entry updated.' : 'Learning entry saved and streak updated!', 'success');
      renderActiveView();
    });

    ['learningSearch', 'learningLangFilter', 'learningSortFilter'].forEach((id) => {
      $(id).addEventListener('input', () => {
        renderLearningList();
        refreshIcons();
      });
      $(id).addEventListener('change', () => {
        renderLearningList();
        refreshIcons();
      });
    });

    // --- Bug Diary ---
    $('toggleBugFormBtn').addEventListener('click', () => {
      const panel = $('bugFormPanel');
      if (panel.classList.contains('collapsed')) {
        resetBugForm();
        panel.classList.remove('collapsed');
        $('bugTitle').focus();
      } else {
        panel.classList.add('collapsed');
      }
    });

    $('cancelBugBtn').addEventListener('click', () => {
      resetBugForm();
      $('bugFormPanel').classList.add('collapsed');
    });

    $('bugForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = $('bugEditId').value || null;
      const res = Storage.saveBug(
        {
          title: $('bugTitle').value,
          language: $('bugLanguage').value,
          date: $('bugDate').value,
          error: $('bugError').value,
          solution: $('bugSolution').value
        },
        editId
      );
      if (!res.ok) {
        $('bugFormError').textContent = res.error;
        showToast(res.error, 'error');
        return;
      }
      resetBugForm();
      $('bugFormPanel').classList.add('collapsed');
      showToast(editId ? 'Bug record updated.' : 'Bug and solution documented!', 'success');
      renderActiveView();
    });

    ['bugSearch', 'bugLangFilter'].forEach((id) => {
      $(id).addEventListener('input', () => {
        renderBugList();
        refreshIcons();
      });
      $(id).addEventListener('change', () => {
        renderBugList();
        refreshIcons();
      });
    });

    // --- Code Snippets ---
    $('toggleSnippetFormBtn').addEventListener('click', () => {
      const panel = $('snippetFormPanel');
      if (panel.classList.contains('collapsed')) {
        resetSnippetForm();
        panel.classList.remove('collapsed');
        $('snippetTitle').focus();
      } else {
        panel.classList.add('collapsed');
      }
    });

    $('cancelSnippetBtn').addEventListener('click', () => {
      resetSnippetForm();
      $('snippetFormPanel').classList.add('collapsed');
    });

    $('snippetForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = $('snippetEditId').value || null;
      const res = Storage.saveSnippet(
        {
          title: $('snippetTitle').value,
          language: $('snippetLanguage').value,
          description: $('snippetDescription').value,
          code: $('snippetCode').value
        },
        editId
      );
      if (!res.ok) {
        $('snippetFormError').textContent = res.error;
        showToast(res.error, 'error');
        return;
      }
      resetSnippetForm();
      $('snippetFormPanel').classList.add('collapsed');
      showToast(editId ? 'Code snippet updated.' : 'Code snippet saved!', 'success');
      renderActiveView();
    });

    ['snippetSearch', 'snippetLangFilter'].forEach((id) => {
      $(id).addEventListener('input', () => {
        renderSnippetList();
        refreshIcons();
      });
      $(id).addEventListener('change', () => {
        renderSnippetList();
        refreshIcons();
      });
    });

    // --- Useful Commands ---
    $('toggleCommandFormBtn').addEventListener('click', () => {
      const panel = $('commandFormPanel');
      if (panel.classList.contains('collapsed')) {
        resetCommandForm();
        panel.classList.remove('collapsed');
        $('commandTitle').focus();
      } else {
        panel.classList.add('collapsed');
      }
    });

    $('cancelCommandBtn').addEventListener('click', () => {
      resetCommandForm();
      $('commandFormPanel').classList.add('collapsed');
    });

    $('commandForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = $('commandEditId').value || null;
      const res = Storage.saveCommand(
        {
          title: $('commandTitle').value,
          category: $('commandCategory').value,
          command: $('commandValue').value,
          notes: $('commandNotes').value
        },
        editId
      );
      if (!res.ok) {
        $('commandFormError').textContent = res.error;
        showToast(res.error, 'error');
        return;
      }
      resetCommandForm();
      $('commandFormPanel').classList.add('collapsed');
      showToast(editId ? 'Command updated.' : 'Command saved to reference!', 'success');
      renderActiveView();
    });

    $('commandSearch').addEventListener('input', () => {
      renderCommandList();
      refreshIcons();
    });

    $('commandCategoryTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.segmented-tab');
      if (!tab) return;
      appState.commandCategoryFilter = tab.dataset.category;
      renderCommandList();
      refreshIcons();
    });
  }

  function bindCalendarAndSettingsEvents() {
    // Contribution Calendar Tooltip & Day Click
    const weeksEl = $('calendarWeeks');
    const tooltip = $('calendarTooltip');

    weeksEl.addEventListener('mousemove', (e) => {
      const cell = e.target.closest('.cal-cell[data-date]');
      if (!cell) {
        tooltip.classList.remove('visible');
        return;
      }
      const count = Number(cell.dataset.count || 0);
      const text = `${cell.dataset.display} · ${count} ${count === 1 ? 'learning entry' : 'learning entries'}`;
      tooltip.textContent = text;
      tooltip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 260)}px`;
      tooltip.style.top = `${Math.max(e.clientY - 38, 10)}px`;
      tooltip.classList.add('visible');
    });

    weeksEl.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    weeksEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell[data-date]');
      if (!cell) return;
      appState.selectedCalendarDate = cell.dataset.date;
      weeksEl.querySelectorAll('.cal-cell.selected').forEach((c) => c.classList.remove('selected'));
      cell.classList.add('selected');
      renderDayInspector();
      refreshIcons();
    });

    // Settings: Profile Name
    $('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('settingsUserName').value.trim();
      if (!name) {
        showToast('Profile name cannot be empty.', 'error');
        return;
      }
      Storage.updateSettings({ userName: name });
      showToast('Profile name updated.', 'success');
      renderActiveView();
    });

    // Settings: Theme Preferences
    $('themeOptions').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-choice]');
      if (!btn) return;
      const theme = btn.dataset.themeChoice;
      Storage.updateSettings({ theme });
      applyTheme(theme);
      showToast('Theme preference saved.', 'success');
    });

    // Settings: Export JSON
    $('exportJsonBtn').addEventListener('click', () => {
      const jsonStr = Storage.exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codecrumb-backup-${Storage.toLocalISODate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Backup exported as JSON.', 'success');
    });

    // Settings: Import JSON
    $('importJsonBtn').addEventListener('click', () => {
      $('importJsonInput').click();
    });

    $('importJsonInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const res = Storage.importJSON(String(reader.result || ''));
        e.target.value = '';
        if (!res.ok) {
          showToast(res.error, 'error');
          return;
        }
        applyTheme(Storage.getSettings().theme);
        showToast(
          `Imported ${res.counts.learning} entries, ${res.counts.bugs} bugs, ${res.counts.snippets} snippets, and ${res.counts.commands} commands.`,
          'success'
        );
        renderActiveView();
      };
      reader.onerror = () => {
        showToast('Failed to read the selected file.', 'error');
      };
      reader.readAsText(file);
    });

    // Settings: Restore Starter Workspace
    $('restoreSampleBtn').addEventListener('click', () => {
      openConfirmModal(
        'Load sample starter entries?',
        'This replaces your current LocalStorage data with a small set of sample learning entries, bugs, snippets, and commands.',
        'Load Starter Kit',
        () => {
          Storage.restoreStarterSample();
          applyTheme(Storage.getSettings().theme);
          showToast('Starter workspace loaded.', 'success');
          renderActiveView();
        },
        false
      );
    });

    // Settings: Clear All Data
    $('clearAllDataBtn').addEventListener('click', () => {
      openConfirmModal(
        'Clear all CodeCrumb data?',
        'This permanently deletes all learning entries, bugs, code snippets, commands, daily goals, and streak history from this browser. Export a JSON backup first if you want to keep a copy.',
        'Clear Everything',
        () => {
          Storage.clearAllData();
          appState.currentRecallId = null;
          appState.selectedCalendarDate = null;
          applyTheme(Storage.getSettings().theme);
          showToast('All stored data has been cleared.', 'info');
          renderActiveView();
        },
        true
      );
    });
  }

  /* ========================================================================
     Initialization
     ======================================================================== */

  function init() {
    populateSelectOptions();
    applyTheme(Storage.getSettings().theme);
    resetLearningForm();
    resetBugForm();
    resetSnippetForm();
    resetCommandForm();

    bindGlobalEvents();
    bindDashboardEvents();
    bindModuleFormsAndFilters();
    bindCalendarAndSettingsEvents();

    renderActiveView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
