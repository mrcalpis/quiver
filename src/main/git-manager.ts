import git from 'isomorphic-git'
import * as fs from 'fs'
import { join } from 'path'
import { existsSync, mkdirSync, cpSync } from 'fs'
import { homedir } from 'os'
import type { SkillCommit, DiffResult } from '../types/git'

const TRASH_DIR = join(homedir(), '.quiver', 'trash')

const GIT_AUTHOR = { name: 'Quiver', email: 'quiver@local' }

export async function ensureRepo(skillPath: string): Promise<void> {
  const gitDir = join(skillPath, '.git')
  if (!existsSync(gitDir)) {
    await git.init({ fs, dir: skillPath })
    await commitAll(skillPath, 'Initial commit')
  }
}

async function commitAll(skillPath: string, message: string): Promise<string> {
  await git.add({ fs, dir: skillPath, filepath: '.' })
  const oid = await git.commit({
    fs,
    dir: skillPath,
    message,
    author: GIT_AUTHOR
  })
  return oid
}

export async function commit(skillPath: string, message: string): Promise<string> {
  await ensureRepo(skillPath)
  return commitAll(skillPath, message)
}

export async function getHistory(skillPath: string): Promise<SkillCommit[]> {
  await ensureRepo(skillPath)
  const commits = await git.log({ fs, dir: skillPath, depth: 50 })
  return commits.map((c) => ({
    oid: c.oid,
    message: c.commit.message.trim(),
    timestamp: c.commit.committer.timestamp * 1000,
    author: c.commit.author.name
  }))
}

export async function getDiff(
  skillPath: string,
  oid1: string,
  oid2: string
): Promise<DiffResult> {
  const getContent = async (oid: string): Promise<string> => {
    try {
      const { blob } = await git.readBlob({
        fs,
        dir: skillPath,
        oid,
        filepath: 'SKILL.md'
      })
      return Buffer.from(blob).toString('utf-8')
    } catch {
      // Try to find any .md file
      return ''
    }
  }

  const [oldContent, newContent] = await Promise.all([
    getContent(oid1),
    getContent(oid2)
  ])

  return { oldContent, newContent, hunks: [] }
}

export async function rollback(skillPath: string, oid: string): Promise<void> {
  await ensureRepo(skillPath)

  // Backup current state to trash
  const backupId = `${Date.now()}`
  const backupPath = join(TRASH_DIR, backupId)
  if (!existsSync(TRASH_DIR)) mkdirSync(TRASH_DIR, { recursive: true })
  cpSync(skillPath, backupPath, { recursive: true })

  // Checkout files from target commit
  await git.checkout({ fs, dir: skillPath, ref: oid, force: true })

  // Create a new commit marking the rollback
  await commitAll(skillPath, `Rollback to ${oid.slice(0, 7)}`)
}
