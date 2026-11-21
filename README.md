# CodeCrumb – Your Developer Memory Box

**CodeCrumb** is a local-first developer productivity journal built with pure **HTML5, CSS3, and Vanilla JavaScript**. It helps software engineers document daily learning, track bugs alongside verified solutions, curate copyable code snippets and terminal commands, and build a genuine coding streak—with zero backend dependencies or paid APIs.

---

## Key Features

- **Developer Dashboard**: Overview KPIs (learning entries, bugs documented, code snippets, current learning streak), quick-action shortcuts, and a unified recent activity feed.
- **Daily Learning Journal**: Log, edit, search, sort, filter, and delete daily coding notes with language/topic tagging and duplicate detection.
- **Bug Diary**: Record tricky errors and stack traces paired side-by-side with root-cause solutions and one-click fix copying.
- **Code Snippet Library**: Save reusable functions and patterns with Tab-indented editing, language filtering, line counts, and one-click clipboard copying.
- **Useful Commands**: Categorized cheat sheet for Git commands, terminal one-liners, VS Code shortcuts, and programming tips with copy buttons on every entry.
- **Real Learning Streak Calendar**: GitHub-inspired full-year contribution heatmap calculated strictly from actual saved learning entries—tracking current streak, longest streak, total active days, and clickable daily inspection.
- **Unique Productivity Boosters**:
  - **Developer Quote of the Day** with instant quote cycling
  - **Today's Coding Goal** with daily completion toggle
  - **Achievement Badges** dynamically unlocked from real activity (`First Entry`, `7-Day Learner`, `14-Day Momentum`, `30-Day Learner`, `Bug Hunter`, `Snippet Architect`, `Command Master`, `Knowledge Vault`)
  - **Random Knowledge Recall** for spaced revision of past notes
  - **Weekly Learning Summary** breaking down your last 7 days
- **Global Search & Local Portability**: Instant `/` keyboard shortcut global search across all sections, 3 visual themes (Deep Navy, Obsidian, Daylight Slate), JSON export/import backup, and confirmed reset.

---

## Project Folder Structure

```text
CodeCrumb/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── storage.js
│   ├── streak.js
│   ├── features.js
│   └── app.js
├── assets/
│   └── icons/
│       ├── favicon.svg
│       └── logo.svg
└── README.md
```

---

## Running CodeCrumb in VS Code

1. Extract `CodeCrumb.zip` to a folder on your computer.
2. Open **Visual Studio Code**, choose **File → Open Folder…**, and select the extracted `CodeCrumb` folder.
3. **Option A (Recommended – Live Server)**:
   - Install the **Live Server** extension by Ritwick Dey from the VS Code Extensions marketplace.
   - Right-click `index.html` in the VS Code Explorer and select **Open with Live Server**.
4. **Option B (Direct Browser Open)**:
   - Double-click `index.html` in your file manager to open it directly in Chrome, Edge, Firefox, or Safari. Because CodeCrumb uses classic script loading and `localStorage`, it works completely locally without a build step.

---

## Initializing Git and Pushing to GitHub

Open the integrated terminal inside VS Code (`Ctrl + \`` / `Cmd + \``) in the `CodeCrumb` directory and run:

```bash
# 1. Initialize a new Git repository on the main branch
git init -b main

# 2. Stage all project files
git add .

# 3. Create your initial commit
git commit -m "Initial commit: CodeCrumb developer memory box"

# 4. Create an empty repository named "CodeCrumb" on GitHub (do NOT add README/.gitignore there),
#    then connect it as your remote origin (replace YOUR_USERNAME with your GitHub handle):
git remote add origin https://github.com/YOUR_USERNAME/CodeCrumb.git

# 5. Push your code to GitHub
git push -u origin main
```

Optional: Enable **GitHub Pages** under your repository's **Settings → Pages → Deploy from branch (`main` / root)** to host CodeCrumb live for free on your portfolio!

---

## Tech Stack

- **HTML5** (Semantic layout, ARIA landmarks, accessible forms)
- **CSS3** (Custom properties, glassmorphism, responsive CSS Grid/Flexbox, 3 themes)
- **Vanilla JavaScript (ES6+)** (Modular IIFE architecture across `storage.js`, `streak.js`, `features.js`, `app.js`)
- **LocalStorage** (100% browser-local persistence with JSON export/import)
- **Lucide Icons** (Clean vector iconography)
