import { useEffect, useState } from 'react'
import type { QualityResult } from '../../../../types/skill'

const gradeStyle: Record<string, { bar: string; badge: string }> = {
  A: { bar: 'bg-green-500', badge: 'bg-green-500/20 text-green-400' },
  B: { bar: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-400' },
  C: { bar: 'bg-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400' },
  D: { bar: 'bg-red-500', badge: 'bg-red-500/20 text-red-400' }
}

interface Props {
  skillId: string
}

export default function QualityScore({ skillId }: Props) {
  const [result, setResult] = useState<QualityResult | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setResult(null)
    window.quiver.quality.analyze(skillId).then((res) => {
      if (res.data) setResult(res.data as QualityResult)
    })
  }, [skillId])

  if (!result) {
    return (
      <div className="p-3">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Quality
        </div>
        <div className="text-xs text-muted-foreground">Analyzing...</div>
      </div>
    )
  }

  const style = gradeStyle[result.score]
  const failedChecks = result.checks.filter((c) => !c.passed)

  return (
    <div className="p-3">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Quality
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm font-bold px-2 py-0.5 rounded ${style.badge}`}>
          {result.score}
        </span>
        <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${style.bar}`}
            style={{ width: `${result.numericScore}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{result.numericScore}/100</span>
      </div>

      {failedChecks.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          {expanded ? '▼' : '▶'} {failedChecks.length} suggestion{failedChecks.length > 1 ? 's' : ''}
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2">
          {result.checks.map((check) => (
            <div key={check.id} className="flex gap-2">
              <span className={`text-xs mt-0.5 shrink-0 ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <div>
                <div className="text-xs text-foreground/80">{check.label}</div>
                {!check.passed && check.suggestion && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{check.suggestion}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
