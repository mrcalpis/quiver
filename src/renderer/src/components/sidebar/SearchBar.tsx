import { useEffect, useRef } from 'react'
import { useSkillStore } from '../../stores/skill-store'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useSkillStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search skills..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-ring border border-transparent focus:border-ring transition-colors"
      />
    </div>
  )
}
