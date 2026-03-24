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

async function readBlobSafe(
  skillPath: string,
  oid: string,
  filepath: string
): Promise<string> {
  try {
    const { blob } = await git.readBlob({ fs, dir: skillPath, oid, filepath })
    return Buffer.from(blob).toString('utf-8')
  } catch {
    return ''
  }
}

async function listTreeFiles(skillPath: string, oid: string): Promise<string[]> {
  const files: string[] = []
  try {
    const commit = await git.readCommit({ fs, dir: skillPath, oid })
    const treeOid = commit.commit.tree

    async function walk(treeOid: string, prefix: string) {
      const { tree } = await git.readTree({ fs, dir: skillPath, oid: treeOid })
      for (const entry of tree) {
        const path = prefix ? `${prefix}/${entry.path}` : entry.path
        if (entry.type === 'tree') {
          await walk(entry.oid, path)
        } else {
          files.push(path)
        }
      }
    }

    await walk(treeOid, '')
  } catch {
    // ignore
  }
  return files
}

export async function getDiff(
  skillPath: string,
  oid1: string,
  oid2: string
): Promise<DiffResult> {
  // 'empty' sentinel = initial commit with no parent, diff against nothing
  if (oid1 === 'empty') {
    const files2 = await listTreeFiles(skillPath, oid2)
    const mainFile = files2.find((f) => f.toUpperCase() === 'SKILL.MD') || files2[0] || 'SKILL.md'
    const newContent = await readBlobSafe(skillPath, oid2, mainFile)
    return { oldContent: '', newContent, hunks: [] }
  }

  // Collect all files from both commits
  const [files1, files2] = await Promise.all([
    listTreeFiles(skillPath, oid1),
    listTreeFiles(skillPath, oid2)
  ])
  const allFiles = Array.from(new Set([...files1, ...files2]))

  // Build combined old/new content showing all files
  const parts: Array<{ file: string; old: string; new: string }> = []
  for (const file of allFiles) {
    const [old, newC] = await Promise.all([
      readBlobSafe(skillPath, oid1, file),
      readBlobSafe(skillPath, oid2, file)
    ])
    if (old !== newC) parts.push({ file, old, new: newC })
  }

  if (parts.length === 0) {
    // No changes — just return the main file content
    const mainFile = allFiles.find((f) => f.toUpperCase() === 'SKILL.MD') || allFiles[0] || 'SKILL.md'
    const [oldContent, newContent] = await Promise.all([
      readBlobSafe(skillPath, oid1, mainFile),
      readBlobSafe(skillPath, oid2, mainFile)
    ])
    return { oldContent, newContent, hunks: [] }
  }

  // Combine changed files with headers
  const oldContent = parts.map((p) => `### ${p.file}\n${p.old}`).join('\n\n')
  const newContent = parts.map((p) => `### ${p.file}\n${p.new}`).join('\n\n')

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
