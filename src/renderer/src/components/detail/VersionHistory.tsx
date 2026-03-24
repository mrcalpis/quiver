import { useEffect, useState } from 'react'
import type { SkillCommit } from '../../../../types/git'

interface Props {
  skillPath: string
  onRollback?: () => void
}

export default function VersionHistory({ skillPath, onRollback }: Props) {
  const [commits, setCommits] = useState<SkillCommit[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)

  useEffect(() => {
    setCommits([])
    window.quiver.git.history(skillPath).then((res) => {
      if (res.data) setCommits(res.data as SkillCommit[])
    })
  }, [skillPath])

  const handleRollback = async () => {
    if (!selected) return
    const confirmed = window.confirm(
      `Rollback to this version? Current state will be backed up to trash.`
    )
    if (!confirmed) return
    setIsRollingBack(true)
    await window.quiver.git.rollback(skillPath, selected)
    setIsRollingBack(false)
    setSelected(null)
    onRollback?.()

    // Refresh history
    const res = await window.quiver.git.history(skillPath)
    if (res.data) setCommits(res.data as SkillCommit[])
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  if (commits.length === 0) {
    return (
      <div className="p-3">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Version History
        </div>
        <div className="text-xs text-muted-foreground">No commits yet</div>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Version History
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {commits.map((commit, i) => (
          <button
            key={commit.oid}
            onClick={() => setSelected(selected === commit.oid ? null : commit.oid)}
            className={`w-full text-left px-2 py-1.5 rounded-md transition-colors ${
              selected === commit.oid
                ? 'bg-primary/20 border border-primary/40'
                : 'hover:bg-secondary'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
              <span className="text-xs text-foreground/80 truncate flex-1">{commit.message}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDate(commit.timestamp)}
              </span>
            </div>
            <div className="ml-3.5 text-[10px] text-muted-foreground font-mono">
              {commit.oid.slice(0, 7)}
            </div>
          </button>
        ))}
      </div>

      {selected && selected !== commits[0]?.oid && (
        <button
          onClick={handleRollback}
          disabled={isRollingBack}
          className="mt-2 w-full text-xs py-1.5 rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-40"
        >
          {isRollingBack ? 'Rolling back...' : '↩ Rollback to this version'}
        </button>
      )}
    </div>
  )
}
