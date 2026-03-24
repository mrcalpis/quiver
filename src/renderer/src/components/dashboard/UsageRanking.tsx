import type { UsageStat } from '../../../../types/skill'

interface Props {
  stats: UsageStat[]
}

export default function UsageRanking({ stats }: Props) {
  if (stats.length === 0) return null

  const maxCount = Math.max(...stats.map((s) => s.count), 1)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">Most Used Skills</h2>
      <div className="space-y-2">
        {stats.slice(0, 20).map((stat, i) => (
          <div key={stat.skillName} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm truncate">{stat.skillName}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {stat.count}×
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(stat.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
