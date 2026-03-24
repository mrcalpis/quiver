import { useState } from 'react'
import { useUiStore } from '../../stores/ui-store'
import { useSkillStore } from '../../stores/skill-store'
import type { Skill } from '../../../../types/skill'

type ImportMode = 'file' | 'url'

export default function ImportDialog() {
  const { setShowImportDialog } = useUiStore()
  const { setSkills } = useSkillStore()
  const [scope, setScope] = useState<'global' | 'project'>('global')
  const [projectPath, setProjectPath] = useState('')
  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')

  const doImport = async (srcPath: string) => {
    setIsImporting(true)
    setError('')
    const importResult = await window.quiver.files.importSkill(
      srcPath,
      scope,
      scope === 'project' ? projectPath : undefined
    )
    setIsImporting(false)

    if (importResult.error) {
      setError(importResult.error)
      return
    }

    const refreshed = await window.quiver.skills.scanAll()
    if (refreshed.data) setSkills(refreshed.data as Skill[])
    setShowImportDialog(false)
  }

  const handlePickFile = async () => {
    const result = await window.quiver.files.openFilePicker({
      filters: [{ name: 'Quiver Skill', extensions: ['quiver'] }],
      properties: ['openFile']
    })
    const res = result.data as { filePaths: string[]; canceled: boolean }
    if (res.canceled || !res.filePaths[0]) return
    await doImport(res.filePaths[0])
  }

  const handleImportUrl = async () => {
    if (!url.trim()) return
    setIsImporting(true)
    setError('')

    // Normalize GitHub repo URL to zip download URL
    let downloadUrl = url.trim()
    const ghMatch = downloadUrl.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/
    )
    if (ghMatch) {
      downloadUrl = `https://github.com/${ghMatch[1]}/${ghMatch[2]}/archive/refs/heads/main.zip`
    }

    // Download to temp via IPC
    const dlResult = await window.quiver.files.downloadUrl(downloadUrl)
    setIsImporting(false)

    if ((dlResult as { error?: string }).error) {
      setError((dlResult as { error: string }).error)
      return
    }

    const tempPath = (dlResult as { data: string }).data
    await doImport(tempPath)
  }

  const handlePickProject = async () => {
    const result = await window.quiver.files.openFolderPicker()
    const res = result.data as { filePaths: string[]; canceled: boolean }
    if (!res.canceled && res.filePaths[0]) setProjectPath(res.filePaths[0])
  }

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-5 w-96 shadow-xl">
        <h3 className="text-sm font-semibold mb-4">Import Skill</h3>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Source</label>
            <div className="flex gap-2">
              {(['file', 'url'] as ImportMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {m === 'file' ? '📦 .quiver File' : '🔗 GitHub URL'}
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          {mode === 'url' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">GitHub URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-secondary text-xs px-3 py-2 rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 ring-primary"
              />
            </div>
          )}

          {/* Scope */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Import to</label>
            <div className="flex gap-2">
              {(['global', 'project'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    scope === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {s === 'global' ? '📦 Global' : '📁 Project'}
                </button>
              ))}
            </div>
          </div>

          {scope === 'project' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Project Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectPath}
                  readOnly
                  placeholder="Select project..."
                  className="flex-1 bg-secondary text-xs px-2 py-1.5 rounded-md text-muted-foreground"
                />
                <button
                  onClick={handlePickProject}
                  className="px-2 py-1.5 text-xs bg-secondary rounded-md"
                >
                  Browse
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={() => setShowImportDialog(false)}
            className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'file' ? handlePickFile : handleImportUrl}
            disabled={
              isImporting ||
              (scope === 'project' && !projectPath) ||
              (mode === 'url' && !url.trim())
            }
            className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors font-medium"
          >
            {isImporting ? 'Importing...' : mode === 'file' ? 'Pick .quiver File' : 'Import from URL'}
          </button>
        </div>
      </div>
    </div>
  )
}
