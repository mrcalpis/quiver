import { readFileSync } from 'fs'
import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import type { Skill, QualityResult, QualityCheck, QualityGrade } from '../types/skill'

const TRIGGER_KEYWORDS = [
  'when', 'use when', 'trigger', 'activate', '使用時機', '觸發', '當'
]

const EXAMPLE_HEADERS = [
  '## example', '## examples', '## 範例', '## 示例', '## usage'
]

const PITFALL_HEADERS = [
  '## pitfall', '## pitfalls', '## common mistake', '## common mistakes',
  '## 踩坑', '## 注意', '## warning', '## caution', '## gotcha'
]

function hasSection(content: string, headers: string[]): boolean {
  const lower = content.toLowerCase()
  return headers.some((h) => lower.includes(h))
}

function scoreToGrade(score: number): QualityGrade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export function analyzeSkill(skill: Skill): QualityResult {
  let mainContent = ''
  const mainFile = skill.files.find(
    (f) => f.name.toUpperCase() === 'SKILL.MD' || f.type === 'main'
  ) || skill.files.find((f) => f.name.endsWith('.md'))

  if (mainFile) {
    try {
      mainContent = readFileSync(mainFile.path, 'utf-8')
    } catch {
      // ignore
    }
  }

  const checks: QualityCheck[] = []

  // 1. has-name (10pts)
  const hasName = Boolean(skill.frontmatter.name)
  checks.push({
    id: 'has-name',
    label: 'Has name in frontmatter',
    passed: hasName,
    points: 10,
    suggestion: hasName ? undefined : 'Add `name:` field to YAML frontmatter'
  })

  // 2. has-description (15pts)
  const hasDesc = Boolean(skill.frontmatter.description)
  checks.push({
    id: 'has-description',
    label: 'Has description in frontmatter',
    passed: hasDesc,
    points: 15,
    suggestion: hasDesc ? undefined : 'Add `description:` field to YAML frontmatter'
  })

  // 3. description-is-trigger (25pts)
  const desc = (skill.frontmatter.description as string) || ''
  const isTrigger = TRIGGER_KEYWORDS.some((kw) => desc.toLowerCase().includes(kw))
  checks.push({
    id: 'description-is-trigger',
    label: 'Description describes when to use (trigger condition)',
    passed: isTrigger,
    points: 25,
    suggestion: isTrigger
      ? undefined
      : 'Rewrite description to say "Use when..." or "Activate when..." rather than "This skill does..."'
  })

  // 4. has-examples (15pts)
  const hasExamples = hasSection(mainContent, EXAMPLE_HEADERS)
  checks.push({
    id: 'has-examples',
    label: 'Has Examples section',
    passed: hasExamples,
    points: 15,
    suggestion: hasExamples ? undefined : 'Add an `## Examples` section with concrete usage examples'
  })

  // 5. has-pitfalls (15pts)
  const hasPitfalls = hasSection(mainContent, PITFALL_HEADERS)
  checks.push({
    id: 'has-pitfalls',
    label: 'Has Common Pitfalls section',
    passed: hasPitfalls,
    points: 15,
    suggestion: hasPitfalls
      ? undefined
      : 'Add a `## Common Pitfalls` section (Anthropic best practice: record mistakes Claude actually makes)'
  })

  // 6. has-references (10pts)
  const refsDir = join(skill.path, 'references')
  const hasRefs = existsSync(refsDir) && readdirSync(refsDir).length > 0
  checks.push({
    id: 'has-references',
    label: 'Has references/ subfolder (progressive disclosure)',
    passed: hasRefs,
    points: 10,
    suggestion: hasRefs
      ? undefined
      : 'Consider moving detailed reference material to a `references/` subfolder'
  })

  // 7. has-memory (5pts)
  const memoryIndicators = ['log', 'memory', 'history', 'append', 'sqlite', 'jsonl']
  const hasMemory = memoryIndicators.some(
    (m) =>
      mainContent.toLowerCase().includes(m) ||
      skill.files.some((f) => f.name.toLowerCase().includes(m))
  )
  checks.push({
    id: 'has-memory',
    label: 'Has memory/logging mechanism',
    passed: hasMemory,
    points: 5,
    suggestion: hasMemory ? undefined : 'Consider adding an append-only log for skill memory'
  })

  // 8. markdown-valid (5pts)
  const hasHeadings = /^#{1,3} .+/m.test(mainContent)
  const notEmpty = mainContent.length > 50
  const markdownValid = hasHeadings && notEmpty
  checks.push({
    id: 'markdown-valid',
    label: 'Valid markdown structure',
    passed: markdownValid,
    points: 5,
    suggestion: markdownValid ? undefined : 'Ensure the skill file has proper markdown headings and content'
  })

  const numericScore = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.points, 0)

  return {
    score: scoreToGrade(numericScore),
    numericScore,
    checks
  }
}
