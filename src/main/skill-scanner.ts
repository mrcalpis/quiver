import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { createHash } from 'crypto'
import yaml from 'js-yaml'
import type { Skill, SkillFile, SkillFileType } from '../types/skill'

const GLOBAL_SKILLS_DIR = join(homedir(), '.claude', 'skills')
const SKIP_FOLDERS = new Set(['_shared', 'learned', 'node_modules', '.git'])

export function skillId(path: string): string {
  return createHash('sha1').update(path).digest('hex').slice(0, 12)
}

export function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  try {
    return (yaml.load(match[1]) as Record<string, unknown>) || {}
  } catch {
    return {}
  }
}

function classifyFile(filePath: string, parentFolder: string): SkillFileType {
  const folder = basename(parentFolder).toLowerCase()
  if (folder === 'references') return 'reference'
  if (folder === 'scripts') return 'script'
  if (folder === 'hooks') return 'hook'
  if (folder === 'agents') return 'agent'
  const name = basename(filePath).toLowerCase()
  if (name === 'skill.md' || name === 'instructions.md') return 'main'
  return 'other'
}

function collectFiles(dir: string, skillRoot: string): SkillFile[] {
  const files: SkillFile[] = []
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        files.push(...collectFiles(fullPath, skillRoot))
      } else {
        files.push({
          name: entry,
          path: fullPath,
          type: classifyFile(fullPath, dir)
        })
      }
    }
  } catch {
    // ignore permission errors
  }
  return files
}

function parseSkillFolder(
  folderPath: string,
  scope: 'global' | 'project',
  projectName?: string,
  projectPath?: string
): Skill | null {
  const files = collectFiles(folderPath, folderPath)
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))
  if (mdFiles.length === 0) return null

  // Find the main skill file: SKILL.md > *.md
  const mainFile =
    files.find((f) => f.name.toUpperCase() === 'SKILL.MD') ||
    files.find((f) => f.type === 'main') ||
    mdFiles[0]

  let frontmatter: Record<string, unknown> = {}
  try {
    const content = readFileSync(mainFile.path, 'utf-8')
    frontmatter = parseFrontmatter(content)
  } catch {
    // ignore
  }

  const name =
    (frontmatter.name as string) || basename(folderPath).replace(/-/g, ' ')
  const description = (frontmatter.description as string) || ''

  let lastModified = 0
  try {
    lastModified = statSync(mainFile.path).mtimeMs
  } catch {
    // ignore
  }

  return {
    id: skillId(folderPath),
    name,
    description,
    path: folderPath,
    scope,
    projectName,
    projectPath,
    files,
    frontmatter,
    lastModified
  }
}

export function scanGlobalSkills(): Skill[] {
  if (!existsSync(GLOBAL_SKILLS_DIR)) return []
  const skills: Skill[] = []

  try {
    for (const entry of readdirSync(GLOBAL_SKILLS_DIR)) {
      if (SKIP_FOLDERS.has(entry) || entry.startsWith('.')) continue
      const fullPath = join(GLOBAL_SKILLS_DIR, entry)
      if (!statSync(fullPath).isDirectory()) continue
      const skill = parseSkillFolder(fullPath, 'global')
      if (skill) skills.push(skill)
    }
  } catch {
    // ignore
  }

  return skills
}

export function scanProjectSkills(projectPath: string): Skill[] {
  const skillsDir = join(projectPath, '.claude', 'skills')
  if (!existsSync(skillsDir)) return []

  const projectName = basename(projectPath)
  const skills: Skill[] = []

  try {
    for (const entry of readdirSync(skillsDir)) {
      if (entry.startsWith('.')) continue
      const fullPath = join(skillsDir, entry)
      if (!statSync(fullPath).isDirectory()) continue
      const skill = parseSkillFolder(fullPath, 'project', projectName, projectPath)
      if (skill) skills.push(skill)
    }
  } catch {
    // ignore
  }

  return skills
}
