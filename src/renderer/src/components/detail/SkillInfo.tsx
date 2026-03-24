import type { Skill } from '../../../../types/skill'

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
