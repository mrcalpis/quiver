export type SkillScope = 'global' | 'project'
export type SkillFileType = 'main' | 'reference' | 'script' | 'hook' | 'agent' | 'other'
export type QualityGrade = 'A' | 'B' | 'C' | 'D'

export interface SkillFile {
  name: string
  path: string
  type: SkillFileType
}

export interface QualityCheck {
  id: string
  label: string
  passed: boolean
  points: number
  suggestion?: string
}

export interface QualityResult {
  score: QualityGrade
  numericScore: number
  checks: QualityCheck[]
}

export interface Skill {
  id: string
  name: string
  description: string
  path: string
  scope: SkillScope
  projectName?: string
  projectPath?: string
  files: SkillFile[]
  frontmatter: Record<string, unknown>
  quality?: QualityResult
  lastModified: number // Unix timestamp
}

export interface CreateSkillOptions {
  name: string
  description: string
  scope: SkillScope
  projectPath?: string
  hasReferences: boolean
  examples: string
  pitfalls: string
}

export interface UsageStat {
  skillName: string
  count: number
  lastUsed: number // Unix timestamp
  isZombie: boolean
}

export interface AppConfig {
  projects: string[]
  hookInstalled: boolean
}
