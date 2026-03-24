import { useEffect, useState } from 'react'
import UsageRanking from './UsageRanking'
import ZombieSkills from './ZombieSkills'
import type { UsageStat } from '../../../../types/skill'

type DaysFilter = 7 | 30 | undefined

export default function Dashboard() {
  const [stats, setStats] = useState<UsageStat[]>([])
  const [days, setDays] = useState<DaysFilter>(30)
  const [hookInstalled, setHookInstalled] = useState<boolean | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    window.quiver.usage.isHookInstalled().then((res) => {
      setHookInstalled(res.data ?? false)
    })
    window.quiver.usage.getStats(days).then((res) => {
      if (res.data) setStats(res.data as UsageStat[])
    })
  }, [days])

  const handleInstallHook = async () => {
    setIsInstalling(true)
    await window.quiver.usage.installHook()
    setHookInstalled(true)
    setIsInstalling(false)
  }

  const zombies = stats.filter((s) => s.isZombie)
  const active = stats.filter((s) => !s.isZombie)

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-base font-semibold">Usage Dashboard</h1>
        <div className="flex gap-1">
          {([7, 30, undefined] as DaysFilter[]).map((d) => (
            <button
              key={String(d)}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                days === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {d ? `${d}d` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Hook install banner */}
      {hookInstalled === false && (
        <div className="mb-5 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Enable Usage Tracking</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Install a hook to track which skills you use most
            </div>
          </div>
          <button
            onClick={handleInstallHook}
            disabled={isInstalling}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0 ml-3"
          >
            {isInstalling ? 'Installing...' : 'Install Hook'}
          </button>
        </div>
      )}

      {stats.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12">
          {hookInstalled
            ? 'No usage data yet. Start using your skills!'
            : 'Install the hook to start tracking usage.'}
        </div>
      ) : (
        <div className="space-y-6">
          <UsageRanking stats={active} />
          {zombies.length > 0 && <ZombieSkills stats={zombies} />}
        </div>
      )}
    </div>
  )
}
