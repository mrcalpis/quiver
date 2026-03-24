import { useSkillStore } from '../../stores/skill-store'
import { useUiStore } from '../../stores/ui-store'
import SearchBar from './SearchBar'
import type { Skill } from '../../../../types/skill'


async function handleAddProject(
  setSkills: (skills: Skill[]) => void,
  setLoading: (v: boolean) => void
) {
  const result = await window.quiver.files.openFolderPicker()
  const res = result.data as { filePaths: string[]; canceled: boolean }
  if (res.canceled || !res.filePaths[0]) return

  setLoading(true)
  await window.quiver.skills.addProject(res.filePaths[0])
  const refreshed = await window.quiver.skills.scanAll()
  if (refreshed.data) setSkills(refreshed.data as Skill[])
  setLoading(false)
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'bg-green-500/20 text-green-400'
  if (grade === 'B') return 'bg-blue-500/20 text-blue-400'
  if (grade === 'C') return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

interface SkillItemProps {
  skill: Skill
  isSelected: boolean
  onSelect: () => void
}

function SkillItem({ skill, isSelected, onSelect }: SkillItemProps) {
  const grade = skill.quality?.score

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-md transition-colors text-sm ${
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'text-foreground hover:bg-secondary'
      }`}
    >
      <span className="truncate flex-1">{skill.name}</span>
      {grade && (
        <span className={`text-[10px] font-bold px-1 rounded shrink-0 ${gradeColor(grade)}`}>
          {grade}
        </span>
      )}
    </button>
  )
}

function GroupSection({ label, skills }: { label: string; skills: Skill[] }) {
  const { selectedSkill, setSelectedSkill } = useSkillStore()
  const { setActivePanel } = useUiStore()

  if (skills.length === 0) return null

  return (
    <div className="mb-2">
      <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label} ({skills.length})
      </div>
      {skills.map((skill) => (
        <SkillItem
          key={skill.id}
          skill={skill}
          isSelected={selectedSkill?.id === skill.id}
          onSelect={() => {
            setSelectedSkill(skill)
            setActivePanel('main')
          }}
        />
      ))}
    </div>
  )
}

export default function SkillTree() {
  const { filteredSkills, isLoading, setSkills, setLoading } = useSkillStore()
  const { activePanel, setActivePanel, setShowImportDialog } = useUiStore()

  const skills = filteredSkills()
  const globalSkills = skills.filter((s) => s.scope === 'global')
  const projectGroups = skills
    .filter((s) => s.scope === 'project')
    .reduce<Record<string, Skill[]>>((acc, s) => {
      const key = s.projectName || 'Unknown Project'
      acc[key] = acc[key] || []
      acc[key].push(s)
      return acc
    }, {})

  return (
    <div className="flex flex-col h-full">
      <SearchBar />

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">Loading skills...</div>
        ) : (
          <>
            <GroupSection label="Global" skills={globalSkills} />
            {Object.entries(projectGroups).map(([name, skills]) => (
              <GroupSection key={name} label={name} skills={skills} />
            ))}
            {skills.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">No skills found</div>
            )}
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActivePanel('create')}
            className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            + New Skill
          </button>
          <button
            onClick={() => setActivePanel('dashboard')}
            className={`px-3 text-xs py-1.5 rounded-md transition-colors ${
              activePanel === 'dashboard'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
            title="Usage Dashboard"
          >
            📊
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleAddProject(setSkills, setLoading)}
            className="flex-1 text-xs py-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            title="Add a project folder to scan its .claude/skills/"
          >
            + Add Project
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex-1 text-xs py-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            title="Import a .quiver skill package"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
