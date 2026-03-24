import type { Skill } from '../../../../types/skill'
import { useUiStore } from '../../stores/ui-store'
import { useSkillStore } from '../../stores/skill-store'

const fileTypeIcon: Record<string, string> = {
  main: '📄',
  reference: '📚',
  script: '⚙️',
  hook: '🪝',
  agent: '🤖',
  other: '📎'
}

interface Props {
  skill: Skill
}

export default function SkillInfo({ skill }: Props) {
  const { setShowExportDialog } = useUiStore()
  const { setSkills, setSelectedSkill } = useSkillStore()

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${skill.name}"? It will be moved to ~/.quiver/trash and can be restored manually.`
    )
    if (!confirmed) return
    const res = await window.quiver.files.deleteSkill(skill.id)
    if (!res.error) {
      const refreshed = await window.quiver.skills.scanAll()
      if (refreshed.data) setSkills(refreshed.data as never[])
      setSelectedSkill(null)
    }
  }
  const lastModified = new Date(skill.lastModified)
  const folders = new Set(
    skill.files
      .map((f) => {
        const parts = f.path.replace(skill.path + '/', '').split('/')
        return parts.length > 1 ? parts[0] : null
      })
      .filter(Boolean)
  )

  return (
    <div className="p-3 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold leading-tight">{skill.name}</h2>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
              skill.scope === 'global'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-teal-500/20 text-teal-400'
            }`}
          >
            {skill.scope === 'global' ? 'Global' : skill.projectName}
          </span>
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
            {skill.description}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Files</span>
          <span>{skill.files.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Modified</span>
          <span>{lastModified.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowExportDialog(true)}
          className="flex-1 text-xs py-1.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          Export
        </button>
        <button
          onClick={handleDelete}
          className="text-xs px-3 py-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* File structure */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Structure
        </div>
        <div className="space-y-0.5">
          {/* Root files */}
          {skill.files
            .filter((f) => !f.path.replace(skill.path + '/', '').includes('/'))
            .map((f) => (
              <div key={f.path} className="flex items-center gap-1.5 text-xs text-foreground/80">
                <span>{fileTypeIcon[f.type]}</span>
                <span className="truncate">{f.name}</span>
              </div>
            ))}
          {/* Folders */}
          {Array.from(folders).map((folder) => (
            <div key={folder} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>📁</span>
              <span>{folder}/</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
