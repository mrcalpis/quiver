import { useState } from 'react'
import { useUiStore } from '../../stores/ui-store'
import { useSkillStore } from '../../stores/skill-store'
import type { CreateSkillOptions, Skill } from '../../../../types/skill'

type Step = 1 | 2 | 3 | 4

export default function NewSkillWizard() {
  const { setActivePanel } = useUiStore()
  const { setSkills, skills, setSelectedSkill } = useSkillStore()

  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'global' | 'project'>('global')
  const [projectPath, setProjectPath] = useState('')
  const [description, setDescription] = useState('')
  const [examples, setExamples] = useState('')
  const [pitfalls, setPitfalls] = useState('')
  const [hasReferences, setHasReferences] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handlePickProject = async () => {
    const result = await window.quiver.files.openFolderPicker()
    const res = result.data as { filePaths: string[]; canceled: boolean }
    if (!res.canceled && res.filePaths[0]) {
      setProjectPath(res.filePaths[0])
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!description.trim()) { setError('Description is required'); return }
    if (scope === 'project' && !projectPath) { setError('Select a project folder'); return }

    setIsCreating(true)
    setError('')

    const options: CreateSkillOptions = {
      name: name.trim(),
      description: description.trim(),
      scope,
      projectPath: scope === 'project' ? projectPath : undefined,
      hasReferences,
      examples,
      pitfalls
    }

    const result = await window.quiver.files.createSkill(options)
    setIsCreating(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Refresh skills list
    const refreshed = await window.quiver.skills.scanAll()
    if (refreshed.data) {
      setSkills(refreshed.data as Skill[])
      const created = (refreshed.data as Skill[]).find(
        (s) => s.name.toLowerCase().replace(/\s+/g, '-') === name.toLowerCase().replace(/\s+/g, '-')
      )
      if (created) setSelectedSkill(created)
    }

    setActivePanel('main')
  }

  const steps = [
    { num: 1, label: 'Basics' },
    { num: 2, label: 'Trigger' },
    { num: 3, label: 'Content' },
    { num: 4, label: 'Structure' }
  ]

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step >= s.num
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s.num}
              </div>
              <span className={`text-xs ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px ${step > s.num ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Basic Info</h2>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Skill Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. code-review"
                autoFocus
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-ring"
              />
              {name && (
                <div className="text-xs text-muted-foreground mt-1">
                  Folder: <code className="text-foreground">{name.toLowerCase().replace(/\s+/g, '-')}</code>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Scope</label>
              <div className="flex gap-2">
                {(['global', 'project'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`flex-1 py-2 text-xs rounded-md transition-colors font-medium ${
                      scope === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'global' ? '📦 Global' : '📁 Project'}
                  </button>
                ))}
              </div>
            </div>

            {scope === 'project' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Project Folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath}
                    readOnly
                    placeholder="Select project folder..."
                    className="flex-1 bg-secondary text-sm px-3 py-2 rounded-md outline-none text-muted-foreground"
                  />
                  <button
                    onClick={handlePickProject}
                    className="px-3 py-2 text-xs bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Trigger */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Trigger Condition</h2>
            <p className="text-xs text-muted-foreground">
              Write WHEN Claude should use this skill. This is the most important part —
              describe the trigger, not what the skill does.
            </p>
            <div className="bg-secondary/50 border border-border rounded-md p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">✅ Good description:</div>
              <div className="italic">"Use when the user asks to review code, create a PR, or says 'review this'"</div>
              <div className="font-medium text-foreground mb-1 mt-3">❌ Bad description:</div>
              <div className="italic">"This skill performs code review and creates pull requests"</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (trigger condition)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Use when the user asks to..."
                rows={4}
                autoFocus
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Content */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Content (Optional)</h2>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Examples <span className="text-muted-foreground/50">(recommended)</span>
              </label>
              <textarea
                value={examples}
                onChange={(e) => setExamples(e.target.value)}
                placeholder="Show concrete examples of how Claude should use this skill..."
                rows={4}
                autoFocus
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Common Pitfalls <span className="text-muted-foreground/50">(Anthropic best practice)</span>
              </label>
              <textarea
                value={pitfalls}
                onChange={(e) => setPitfalls(e.target.value)}
                placeholder="Record mistakes Claude commonly makes with this skill..."
                rows={3}
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Structure */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Structure</h2>
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-secondary rounded-md">
              <input
                type="checkbox"
                checked={hasReferences}
                onChange={(e) => setHasReferences(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">Create references/ folder</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Progressive disclosure — store detailed reference material in a subfolder.
                  Claude reads it when needed.
                </div>
              </div>
            </label>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="px-4 py-2 text-sm rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => setActivePanel('main')}
            className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 && !name.trim()}
              className="px-6 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 font-medium"
            >
              {isCreating ? 'Creating...' : 'Create Skill'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
