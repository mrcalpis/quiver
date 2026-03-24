# Quiver — Technical Design

## Overview

Quiver 是一個 Electron 桌面應用程式，採用 main/preload/renderer 三層架構，透過 IPC 橋接主進程（Node.js）與渲染進程（React）。所有檔案系統操作、git 操作、SQLite 讀寫均在 main process 執行，renderer 只負責 UI 呈現。

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Renderer Process (React + TypeScript)               │
│  SkillTree | Editor | QualityPanel | VersionHistory  │
│  UsageDashboard | NewSkillWizard | ImportExport      │
└────────────────────┬────────────────────────────────┘
                     │ contextBridge (IPC)
┌────────────────────▼────────────────────────────────┐
│  Preload Script                                      │
│  window.quiver.* API bridge                         │
└────────────────────┬────────────────────────────────┘
                     │ ipcMain.handle / ipcRenderer.invoke
┌────────────────────▼────────────────────────────────┐
│  Main Process (Node.js)                              │
│  skill-scanner | git-manager | quality-analyzer      │
│  usage-tracker | hook-installer | file-watcher       │
└─────────────────────────────────────────────────────┘
         │           │           │
    ~/.claude/   ~/.quiver/   settings.json
    skills/      usage.db
                 repos/
```

---

## Components and Interfaces

### Project Structure

```
quiver/
├── electron.vite.config.ts
├── electron-builder.yml
├── package.json
├── tsconfig.json
├── src/
│   ├── main/
│   │   ├── index.ts              # App entry, BrowserWindow
│   │   ├── ipc-handlers.ts       # All ipcMain.handle registrations
│   │   ├── skill-scanner.ts      # Scan ~/.claude/skills & project skills
│   │   ├── git-manager.ts        # isomorphic-git wrapper
│   │   ├── quality-analyzer.ts   # Skill quality scoring engine
│   │   ├── usage-tracker.ts      # SQLite read/write for usage data
│   │   ├── hook-installer.ts     # Install/remove hook in settings.json
│   │   └── file-watcher.ts       # chokidar watcher, emit IPC events
│   ├── preload/
│   │   └── index.ts              # contextBridge: window.quiver
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── components/
│           │   ├── layout/
│           │   │   └── AppLayout.tsx
│           │   ├── sidebar/
│           │   │   ├── SkillTree.tsx
│           │   │   ├── SkillTreeItem.tsx
│           │   │   └── SearchBar.tsx
│           │   ├── editor/
│           │   │   ├── SkillEditor.tsx
│           │   │   ├── MarkdownPreview.tsx
│           │   │   └── CommitDialog.tsx
│           │   ├── detail/
│           │   │   ├── SkillDetail.tsx
│           │   │   ├── SkillInfo.tsx
│           │   │   ├── QualityScore.tsx
│           │   │   ├── VersionHistory.tsx
│           │   │   ├── DiffViewer.tsx
│           │   │   └── FileTree.tsx
│           │   ├── dashboard/
│           │   │   ├── Dashboard.tsx
│           │   │   ├── UsageRanking.tsx
│           │   │   └── ZombieSkills.tsx
│           │   ├── create/
│           │   │   └── NewSkillWizard.tsx
│           │   └── import-export/
│           │       ├── ImportDialog.tsx
│           │       └── ExportDialog.tsx
│           ├── stores/
│           │   ├── skill-store.ts
│           │   └── ui-store.ts
│           ├── hooks/
│           │   ├── useSkills.ts
│           │   ├── useGit.ts
│           │   └── useUsage.ts
│           └── types/
│               ├── skill.ts
│               └── git.ts
```

### IPC API Bridge (preload)

```typescript
window.quiver = {
  skills: {
    scanAll(): Promise<Skill[]>
    addProject(path: string): Promise<Skill[]>
    removeProject(path: string): Promise<void>
  },
  files: {
    read(path: string): Promise<string>
    write(path: string, content: string): Promise<void>
    createSkill(options: CreateSkillOptions): Promise<Skill>
    deleteSkill(skillId: string): Promise<void>
    exportSkill(skillId: string, destPath: string): Promise<void>
    importSkill(srcPath: string, scope: 'global' | 'project', projectPath?: string): Promise<Skill>
  },
  git: {
    commit(skillPath: string, message: string): Promise<string>
    history(skillPath: string): Promise<SkillCommit[]>
    diff(skillPath: string, oid1: string, oid2: string): Promise<string>
    rollback(skillPath: string, oid: string): Promise<void>
  },
  quality: {
    analyze(skillId: string): Promise<QualityResult>
  },
  usage: {
    getStats(days?: number): Promise<UsageStat[]>
    installHook(): Promise<void>
    isHookInstalled(): Promise<boolean>
  },
  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}
```

---

## Data Models

### Skill

```typescript
interface Skill {
  id: string                    // SHA1 of absolute path
  name: string                  // From frontmatter
  description: string           // From frontmatter (trigger condition)
  path: string                  // Absolute path to skill folder
  scope: 'global' | 'project'
  projectName?: string
  files: SkillFile[]
  frontmatter: Record<string, unknown>
  quality?: QualityResult
  lastModified: Date
}

interface SkillFile {
  name: string
  path: string
  type: 'main' | 'reference' | 'script' | 'hook' | 'agent' | 'other'
}
```

### QualityResult

```typescript
interface QualityResult {
  score: 'A' | 'B' | 'C' | 'D'
  numericScore: number          // 0-100
  checks: QualityCheck[]
}

interface QualityCheck {
  id: string
  label: string
  passed: boolean
  suggestion?: string
}
```

Quality checks (based on Anthropic internal best practices):
1. `has-name` — frontmatter has `name` (10pts)
2. `has-description` — frontmatter has `description` (15pts)
3. `description-is-trigger` — description contains trigger keywords (25pts)
4. `has-examples` — body has Examples section (15pts)
5. `has-pitfalls` — body has pitfalls/踩坑 section (15pts)
6. `has-references` — `references/` subfolder exists (10pts)
7. `has-memory` — log file or memory mechanism exists (5pts)
8. `markdown-valid` — valid markdown structure (5pts)

### Git Types

```typescript
interface SkillCommit {
  oid: string
  message: string
  timestamp: Date
  author: string
}
```

### Usage Types

```typescript
interface UsageRecord {
  skillName: string
  invokedAt: Date
  source: 'slash-command' | 'hook'
}

interface UsageStat {
  skillName: string
  count: number
  lastUsed: Date
  isZombie: boolean
}
```

---

## Key Module Designs

### skill-scanner.ts

- Scan `~/.claude/skills/` — skip `_shared/`, `learned/`
- Each subfolder with a `.md` file is a skill
- Parse YAML frontmatter with `js-yaml`
- Classify files by subfolder name (references/, scripts/, hooks/, agents/)

### git-manager.ts

- Use `isomorphic-git` with Node.js `fs` module
- Git repo lives directly in the skill folder
- On first access: `git init` + initial commit if not already tracked
- All commits attributed to `Quiver <quiver@local>`

### quality-analyzer.ts

- Pure synchronous function — no async needed
- Each check returns boolean + optional suggestion string
- Grade thresholds: A ≥ 85, B ≥ 70, C ≥ 50, D < 50

### usage-tracker.ts (SQLite schema)

```sql
CREATE TABLE usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  invoked_at INTEGER NOT NULL,
  source TEXT NOT NULL
);
CREATE INDEX idx_skill_name ON usage_events(skill_name);
CREATE INDEX idx_invoked_at ON usage_events(invoked_at);
```

### hook-installer.ts

Installs into `~/.claude/settings.json`:

```json
{
  "UserPromptSubmit": [{
    "hooks": [{"type": "command", "command": "bash ~/.quiver/hooks/track-prompt.sh"}]
  }]
}
```

Hook script parses prompt for `/skill-name` patterns and writes to `~/.quiver/usage.db`.

---

## Error Handling

- All IPC handlers wrapped in try/catch, return `{ error: string }` on failure
- Renderer checks for error in every IPC response
- File write failures show toast notification
- Git failures gracefully degrade (show message, don't crash)
- Missing `~/.claude/skills/` shows empty state UI

---

## Testing Strategy

- **Unit tests** (Vitest): quality-analyzer, skill-scanner parsing, frontmatter parser
- **Integration tests**: IPC handler round-trips using Electron test utilities
- **Manual testing checklist**: Each feature verified against real `~/.claude/skills/` on dev machine

---

## ~/.quiver Directory

```
~/.quiver/
  config.json          # { projects: string[], hookInstalled: boolean }
  usage.db             # SQLite database
  hooks/
    track-prompt.sh    # UserPromptSubmit hook script
  trash/               # Soft-deleted skills
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 28+ |
| Build Tool | electron-vite |
| Frontend | React 18 + TypeScript |
| UI Library | Tailwind CSS + shadcn/ui |
| Editor | Monaco Editor |
| Markdown | react-markdown + remark-gfm |
| State | Zustand |
| Git | isomorphic-git |
| File Watch | chokidar |
| Database | better-sqlite3 |
| YAML | js-yaml |
| Bundler | electron-builder |
