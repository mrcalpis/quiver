import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { UsageStat } from '../types/skill'

const QUIVER_DIR = join(homedir(), '.quiver')
const USAGE_FILE = join(QUIVER_DIR, 'usage.jsonl')
const ZOMBIE_THRESHOLD_DAYS = 30

interface UsageEvent {
  skillName: string
  invokedAt: number
  source: 'slash-command' | 'hook'
}

function ensureDir(): void {
  if (!existsSync(QUIVER_DIR)) {
    mkdirSync(QUIVER_DIR, { recursive: true })
  }
}

function readAllEvents(): UsageEvent[] {
  if (!existsSync(USAGE_FILE)) return []
  try {
    return readFileSync(USAGE_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as UsageEvent)
  } catch {
    return []
  }
}

export function recordUsage(skillName: string, source: 'slash-command' | 'hook'): void {
  ensureDir()
  const event: UsageEvent = { skillName, invokedAt: Date.now(), source }
  appendFileSync(USAGE_FILE, JSON.stringify(event) + '\n')
}

export function getUsageStats(days?: number): UsageStat[] {
  const events = readAllEvents()
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0
  const zombieCutoff = Date.now() - ZOMBIE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  const statsMap = new Map<string, { count: number; lastUsed: number }>()

  for (const event of events) {
    if (event.invokedAt < cutoff) continue
    const existing = statsMap.get(event.skillName) || { count: 0, lastUsed: 0 }
    statsMap.set(event.skillName, {
      count: existing.count + 1,
      lastUsed: Math.max(existing.lastUsed, event.invokedAt)
    })
  }

  return Array.from(statsMap.entries())
    .map(([skillName, { count, lastUsed }]) => ({
      skillName,
      count,
      lastUsed,
      isZombie: lastUsed < zombieCutoff
    }))
    .sort((a, b) => b.count - a.count)
}

export function importBufferFile(bufferPath: string): void {
  if (!existsSync(bufferPath)) return
  try {
    const content = readFileSync(bufferPath, 'utf-8').trim()
    if (content) {
      ensureDir()
      appendFileSync(USAGE_FILE, content + '\n')
    }
    writeFileSync(bufferPath, '')
  } catch {
    // ignore
  }
}
