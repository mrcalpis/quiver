import { useState } from 'react'
import { useUiStore } from '../../stores/ui-store'

interface Props {
  skillPath: string
}

export default function CommitDialog({ skillPath }: Props) {
  const { setShowCommitDialog } = useUiStore()
  const [message, setMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)

  const handleCommit = async () => {
    if (!message.trim()) return
    setIsCommitting(true)
    await window.quiver.git.commit(skillPath, message)
    setIsCommitting(false)
    setShowCommitDialog(false)
    setMessage('')
  }

  const handleSkip = () => {
    setShowCommitDialog(false)
    setMessage('')
  }

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-5 w-96 shadow-xl">
        <h3 className="text-sm font-semibold mb-1">Commit Changes</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Describe what you changed in this skill
        </p>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
          placeholder="e.g. fix trigger condition, add examples..."
          autoFocus
          className="w-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring border border-transparent focus:border-ring mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleSkip}
            className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleCommit}
            disabled={!message.trim() || isCommitting}
            className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors font-medium"
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}
