# Quiver — Requirements Specification

## Overview

**Product**: Quiver
**Version**: 1.0.0
**Description**: An Electron desktop application for managing Claude Code skills — providing visibility, version control, quality assessment, and GUI-based operations across global and project-level skill installations.

---

## Problem Statement

Claude Code users accumulate skills over time but have no centralized way to:
- Know what skills are currently installed (globally or per project)
- Track changes and history of each skill
- Assess whether a skill is well-written or outdated
- Rollback to a previous version of a skill
- Discover skills from others or share their own

---

## User Stories

### US-1: Skill Discovery
**As a** Claude Code user,
**I want** to see all installed skills (global and project-level) in one place,
**so that** I know exactly what capabilities are available to me.

**Acceptance Criteria**:
- WHEN the app launches, THEN it scans `~/.claude/skills/` and all project `.claude/skills/` directories
- WHEN skills are found, THEN they are displayed grouped by scope (Global / Project)
- IF a project directory is open, THEN project-level skills are highlighted separately
- WHEN a skill is selected, THEN its full content is rendered in a readable format

---

### US-2: Version Control
**As a** Claude Code user,
**I want** to commit and track changes to my skills like git,
**so that** I can rollback to a previous working version if I break a skill.

**Acceptance Criteria**:
- WHEN a skill file is modified, THEN Quiver detects the change and marks it as "uncommitted"
- WHEN the user clicks "Commit", THEN a commit message is required and the snapshot is saved
- WHEN viewing a skill, THEN a commit history timeline is visible
- WHEN a user selects a past commit, THEN they can preview the skill at that version
- WHEN a user clicks "Rollback", THEN the skill file is restored to the selected version
- IF no commits exist for a skill, THEN the current state is treated as the initial version

---

### US-3: Quality Assessment
**As a** Claude Code user,
**I want** to see a quality score or assessment for each skill,
**so that** I know which skills are well-structured and which need improvement.

**Acceptance Criteria**:
- WHEN a skill is displayed, THEN a quality score (A/B/C/D or numeric) is shown
- WHEN quality is assessed, THEN it checks: has description, has trigger conditions, has examples, length appropriateness, markdown validity
- WHEN a skill has quality issues, THEN specific suggestions are shown
- IF a skill has no trigger conditions, THEN it is flagged as incomplete

---

### US-4: Skill Editing
**As a** Claude Code user,
**I want** to edit skills directly in the app,
**so that** I don't need to open a separate text editor.

**Acceptance Criteria**:
- WHEN a skill is selected, THEN an inline editor (markdown) is available
- WHEN the user saves changes, THEN the file is updated on disk
- WHEN changes are saved, THEN the user is prompted to commit with a message
- IF the user closes without saving, THEN a warning is shown

---

### US-5: Skill Creation
**As a** Claude Code user,
**I want** to create a new skill from within the app using a template,
**so that** I can quickly scaffold well-structured skills.

**Acceptance Criteria**:
- WHEN the user clicks "New Skill", THEN a form is shown with: name, description, trigger conditions, scope (global/project)
- WHEN the form is submitted, THEN a skill `.md` file is created from a template
- WHEN creation succeeds, THEN the new skill appears in the list immediately
- IF the skill name already exists, THEN an error is shown

---

### US-6: Skill Deletion
**As a** Claude Code user,
**I want** to safely delete skills I no longer need,
**so that** I can keep my environment clean.

**Acceptance Criteria**:
- WHEN the user initiates deletion, THEN a confirmation dialog is shown
- WHEN confirmed, THEN the file is moved to a trash/archive rather than permanently deleted
- WHEN a skill is archived, THEN it can be restored within the app
- IF a skill has uncommitted changes, THEN an additional warning is shown

---

### US-7: Project Context Switching
**As a** Claude Code user working across multiple projects,
**I want** to switch between project contexts,
**so that** I can manage project-specific skills for each project separately.

**Acceptance Criteria**:
- WHEN the user opens a project folder, THEN project-specific skills are loaded
- WHEN switching projects, THEN the skill list updates to show the new project's skills alongside global ones
- WHEN a skill exists in both global and project scope, THEN the project one takes visual precedence

---

## Non-Functional Requirements

### NFR-1: Performance
- App launch time: under 3 seconds
- Skill list rendering: under 500ms for up to 200 skills
- File change detection: within 1 second

### NFR-2: Cross-Platform
- Must run on macOS, Windows, and Linux via Electron

### NFR-3: Data Safety
- Version control data stored locally (no cloud sync in v1)
- No skill content sent to external servers
- All data stored in `~/.quiver/` directory

### NFR-4: Offline First
- All functionality works without internet connection

---

## Out of Scope (v1)

- Cloud sync or sharing of skills
- Marketplace or discovery of third-party skills
- Support for non-Claude Code tools (Cursor, Copilot)
- AI-powered skill improvement suggestions
- Multi-user collaboration
