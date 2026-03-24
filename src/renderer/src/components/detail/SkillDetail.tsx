import { useSkillStore } from '../../stores/skill-store'
import SkillInfo from './SkillInfo'
import QualityScore from './QualityScore'
import VersionHistory from './VersionHistory'

export default function SkillDetail() {
  const { selectedSkill } = useSkillStore()

  if (!selectedSkill) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No skill selected
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto divide-y divide-border">
      <SkillInfo skill={selectedSkill} />
      <QualityScore skillId={selectedSkill.id} />
      <VersionHistory
        skillPath={selectedSkill.path}
        onRollback={() => {
          // Trigger reload of skill content in editor
          window.quiver.on('skill:changed', () => {})
        }}
      />
    </div>
  )
}
