import { useState } from 'react'
import { useUiStore } from '../../stores/ui-store'
import { useSkillStore } from '../../stores/skill-store'
import type { Skill } from '../../../../types/skill'

export default function ImportDialog() {
  const { setShowImportDialog } = useUiStore()
  const { setSkills } = useSkillStore()
  const [scope, setScope] = useState<'global' | 'project'>('global')
  const [projectPath, setProjectPath] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')

  const handlePickAndImport = async () => {
    const result = await window.quiver.files.openFilePicker({
      filters: [{ name: 'Quiver Skill', extensions: ['quiver'] }],
      properties: ['openFile']
    })
    const res = result.data as { filePaths: string[]; canceled: boolean }
    if (res.canceled || !res.filePaths[0]) return

    setIsImporting(true)
    setError('')

    const importResult = await window.quiver.files.importSkill(
      res.filePaths[0],
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
            onClick={handlePickAndImport}
            disabled={isImporting || (scope === 'project' && !projectPath)}
            className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors font-medium"
          >
            {isImporting ? 'Importing...' : 'Pick .quiver file'}
          </button>
        </div>
      </div>
    </div>
  )
}
