import chokidar, { FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { homedir } from 'os'
import { join } from 'path'

let watcher: FSWatcher | null = null

export function startWatcher(projectPaths: string[]): void {
  stopWatcher()

  const globalSkillsDir = join(homedir(), '.claude', 'skills')
  const watchPaths = [
    globalSkillsDir,
    ...projectPaths.map((p) => join(p, '.claude', 'skills'))
  ]

  watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })

  const notify = (event: string, path: string) => {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach((win) => win.webContents.send('skill:changed', { event, path }))
  }

  watcher.on('change', (path) => notify('change', path))
  watcher.on('add', (path) => notify('add', path))
  watcher.on('unlink', (path) => notify('unlink', path))
  watcher.on('addDir', (path) => notify('addDir', path))
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
