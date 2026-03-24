import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync } from 'fs'
import { join, basename, dirname } from 'path'
import { homedir } from 'os'
import AdmZip from 'adm-zip'

import { scanGlobalSkills, scanProjectSkills, skillId } from './skill-scanner'
import { analyzeSkill } from './quality-analyzer'
import { commit, getHistory, getDiff, rollback, ensureRepo } from './git-manager'
import { getUsageStats, recordUsage, importBufferFile } from './usage-tracker'
import { installHook, removeHook, isHookInstalled } from './hook-installer'
import { startWatcher } from './file-watcher'
import type { Skill, CreateSkillOptions } from '../types/skill'

const QUIVER_CONFIG = join(homedir(), '.quiver', 'config.json')
const QUIVER_TRASH = join(homedir(), '.quiver', 'trash')
const BUFFER_FILE = join(homedir(), '.quiver', 'usage-buffer.jsonl')

interface Config {
  projects: string[]
  hookInstalled: boolean
}

function loadConfig(): Config {
  try {
    if (existsSync(QUIVER_CONFIG)) {
      return JSON.parse(readFileSync(QUIVER_CONFIG, 'utf-8')) as Config
    }
  } catch {
    // ignore
  }
  return { projects: [], hookInstalled: false }
}

function saveConfig(config: Config): void {
  const dir = dirname(QUIVER_CONFIG)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(QUIVER_CONFIG, JSON.stringify(config, null, 2))
}

let skillCache: Map<string, Skill> = new Map()

function rebuildCache(skills: Skill[]): void {
  skillCache = new Map(skills.map((s) => [s.id, s]))
}

export function registerIpcHandlers(): void {
  // ── Skills ──────────────────────────────────────────────────────────
  ipcMain.handle('skills:scanAll', async () => {
    try {
      const config = loadConfig()
      const global = scanGlobalSkills()
      const project = config.projects.flatMap((p) => scanProjectSkills(p))
      const all = [...global, ...project]
      rebuildCache(all)
      startWatcher(config.projects)
      // Import any buffered usage events from hook script
      importBufferFile(BUFFER_FILE)
      return { data: all }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('skills:addProject', async (_event, projectPath: string) => {
    try {
      const config = loadConfig()
      if (!config.projects.includes(projectPath)) {
        config.projects.push(projectPath)
        saveConfig(config)
      }
      const skills = scanProjectSkills(projectPath)
      skills.forEach((s) => skillCache.set(s.id, s))
      startWatcher(config.projects)
      return { data: skills }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('skills:removeProject', async (_event, projectPath: string) => {
    try {
      const config = loadConfig()
      config.projects = config.projects.filter((p) => p !== projectPath)
      saveConfig(config)
      startWatcher(config.projects)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Files ────────────────────────────────────────────────────────────
  ipcMain.handle('files:read', async (_event, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { data: content }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('files:write', async (_event, filePath: string, content: string) => {
    try {
      writeFileSync(filePath, content, 'utf-8')
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('files:createSkill', async (_event, options: CreateSkillOptions) => {
    try {
      const skillsDir =
        options.scope === 'global'
          ? join(homedir(), '.claude', 'skills')
          : join(options.projectPath!, '.claude', 'skills')

      const folderName = options.name.toLowerCase().replace(/\s+/g, '-')
      const skillPath = join(skillsDir, folderName)

      if (existsSync(skillPath)) {
        return { error: `Skill "${folderName}" already exists` }
      }

      mkdirSync(skillPath, { recursive: true })

      const content = buildSkillTemplate(options)
      writeFileSync(join(skillPath, 'SKILL.md'), content)

      if (options.hasReferences) {
        mkdirSync(join(skillPath, 'references'), { recursive: true })
        writeFileSync(join(skillPath, 'references', 'README.md'), '# References\n')
      }

      await ensureRepo(skillPath)

      const skills = scanGlobalSkills()
      rebuildCache(skills)

      const created = skillCache.get(skillId(skillPath))
      return { data: created }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('files:deleteSkill', async (_event, id: string) => {
    try {
      const skill = skillCache.get(id)
      if (!skill) return { error: 'Skill not found' }

      if (!existsSync(QUIVER_TRASH)) mkdirSync(QUIVER_TRASH, { recursive: true })
      const trashPath = join(QUIVER_TRASH, `${id}-${Date.now()}`)
      cpSync(skill.path, trashPath, { recursive: true })
      rmSync(skill.path, { recursive: true, force: true })
      skillCache.delete(id)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('files:exportSkill', async (_event, id: string, destPath: string) => {
    try {
      const skill = skillCache.get(id)
      if (!skill) return { error: 'Skill not found' }

      const zip = new AdmZip()
      zip.addLocalFolder(skill.path, skill.name)
      const manifest = {
        name: skill.name,
        description: skill.description,
        exportedAt: new Date().toISOString(),
        quality: skill.quality
      }
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)))
      zip.writeZip(destPath)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(
    'files:importSkill',
    async (_event, srcPath: string, scope: string, projectPath?: string) => {
      try {
        const zip = new AdmZip(srcPath)
        const manifestEntry = zip.getEntry('manifest.json')
        let skillName = basename(srcPath, '.quiver')

        if (manifestEntry) {
          const manifest = JSON.parse(manifestEntry.getData().toString())
          skillName = manifest.name || skillName
        }

        const targetDir =
          scope === 'global'
            ? join(homedir(), '.claude', 'skills')
            : join(projectPath!, '.claude', 'skills')

        const skillPath = join(targetDir, skillName.toLowerCase().replace(/\s+/g, '-'))

        if (existsSync(skillPath)) {
          return { error: `Skill "${skillName}" already exists in target directory` }
        }

        zip.extractAllTo(skillPath, true)
        await ensureRepo(skillPath)

        const [importedSkill] = scope === 'global'
          ? scanGlobalSkills().filter((s) => s.path === skillPath)
          : scanProjectSkills(projectPath!).filter((s) => s.path === skillPath)

        if (importedSkill) skillCache.set(importedSkill.id, importedSkill)
        return { data: importedSkill }
      } catch (err) {
        return { error: String(err) }
      }
    }
  )

  ipcMain.handle('files:openFilePicker', async (_event, options) => {
    const result = await dialog.showOpenDialog(options as Electron.OpenDialogOptions)
    return { data: result }
  })

  ipcMain.handle('files:openFolderPicker', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return { data: result }
  })

  ipcMain.handle('files:saveFilePicker', async (_event, options) => {
    const result = await dialog.showSaveDialog(options as Electron.SaveDialogOptions)
    return { data: result }
  })

  // ── Git ──────────────────────────────────────────────────────────────
  ipcMain.handle('git:commit', async (_event, skillPath: string, message: string) => {
    try {
      const oid = await commit(skillPath, message)
      return { data: oid }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('git:history', async (_event, skillPath: string) => {
    try {
      const history = await getHistory(skillPath)
      return { data: history }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('git:diff', async (_event, skillPath: string, oid1: string, oid2: string) => {
    try {
      const diff = await getDiff(skillPath, oid1, oid2)
      return { data: diff }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('git:rollback', async (_event, skillPath: string, oid: string) => {
    try {
      await rollback(skillPath, oid)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Quality ──────────────────────────────────────────────────────────
  ipcMain.handle('quality:analyze', async (_event, id: string) => {
    try {
      const skill = skillCache.get(id)
      if (!skill) return { error: 'Skill not found' }
      const result = analyzeSkill(skill)
      return { data: result }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Usage ────────────────────────────────────────────────────────────
  ipcMain.handle('usage:getStats', async (_event, days?: number) => {
    try {
      return { data: getUsageStats(days) }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('usage:installHook', async () => {
    try {
      installHook()
      const config = loadConfig()
      config.hookInstalled = true
      saveConfig(config)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('usage:removeHook', async () => {
    try {
      removeHook()
      const config = loadConfig()
      config.hookInstalled = false
      saveConfig(config)
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('usage:isHookInstalled', async () => {
    try {
      return { data: isHookInstalled() }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Usage recording (from hook buffer) ──────────────────────────────
  ipcMain.handle('usage:record', async (_event, skillName: string, source: string) => {
    try {
      recordUsage(skillName, source as 'slash-command' | 'hook')
      return { data: true }
    } catch (err) {
      return { error: String(err) }
    }
  })
}

function buildSkillTemplate(options: CreateSkillOptions): string {
  return `---
name: ${options.name}
description: "${options.description}"
---

# ${options.name}

## When to Use
${options.description}

## Instructions

<!-- Main skill instructions go here -->

## Examples

${options.examples || '<!-- Add concrete usage examples here -->'}

## Common Pitfalls

${options.pitfalls || '<!-- Record mistakes Claude commonly makes with this skill -->'}
`
}
