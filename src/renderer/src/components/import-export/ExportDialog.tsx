import { useState } from 'react'
import { useUiStore } from '../../stores/ui-store'
import { useSkillStore } from '../../stores/skill-store'

export default function ExportDialog() {
  const { setShowExportDialog } = useUiStore()
  const { selectedSkill } = useSkillStore()
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    if (!selectedSkill) return

    const result = await window.quiver.files.saveFilePicker({
      defaultPath: `${selectedSkill.name}.quiver`,
      filters: [{ name: 'Quiver Skill', extensions: ['quiver'] }]
    })

    const res = result.data as { filePath?: string; canceled: boolean }
    if (res.canceled || !res.filePath) return

    setIsExporting(true)
    setError('')

    const exportResult = await window.quiver.files.exportSkill(selectedSkill.id, res.filePath)
    setIsExporting(false)

    if (exportResult.error) {
      setError(exportResult.error)
      return
    }

    setShowExportDialog(false)
  }

  if (!selectedSkill) {
    setShowExportDialog(false)
    return null
  }

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-5 w-80 shadow-xl">
        <h3 className="text-sm font-semibold mb-2">Export Skill</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Export <strong>{selectedSkill.name}</strong> as a <code>.quiver</code> package that others can import.
        </p>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setShowExportDialog(false)}
            className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors font-medium"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
