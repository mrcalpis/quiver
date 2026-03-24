import type { UsageStat } from '../../../../types/skill'

interface Props {
  stats: UsageStat[]
}

export default function ZombieSkills({ stats }: Props) {
  if (stats.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold mb-1">
        🧟 Zombie Skills{' '}
        <span className="text-xs font-normal text-muted-foreground">
          (unused for 30+ days)
        </span>
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        Consider removing or improving these skills
      </p>
      <div className="space-y-1">
        {stats.map((stat) => (
          <div
            key={stat.skillName}
            className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-md"
          >
            <span className="text-sm text-muted-foreground">{stat.skillName}</span>
            <span className="text-xs text-muted-foreground">
              {stat.count > 0
                ? `last used ${new Date(stat.lastUsed).toLocaleDateString()}`
                : 'never used'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
