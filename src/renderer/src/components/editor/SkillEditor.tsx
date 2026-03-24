import { useEffect, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useSkillStore } from '../../stores/skill-store'
import { useUiStore } from '../../stores/ui-store'
import MarkdownPreview from './MarkdownPreview'
import CommitDialog from './CommitDialog'
import type { SkillFile } from '../../../../types/skill'

type ViewMode = 'editor' | 'split' | 'preview'

function getMainFile(files: SkillFile[]): SkillFile | undefined {
  return (
    files.find((f) => f.name.toUpperCase() === 'SKILL.MD') ||
    files.find((f) => f.type === 'main') ||
    files.find((f) => f.name.endsWith('.md'))
  )
}

export default function SkillEditor() {
  const { selectedSkill } = useSkillStore()
  const { isDirty, setDirty, showCommitDialog, setShowCommitDialog, viewMode, setViewMode } =
    useUiStore()

  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<SkillFile | undefined>()

  useEffect(() => {
    if (!selectedSkill) return
    const mainFile = getMainFile(selectedSkill.files)
    if (!mainFile) return

    setSelectedFile(mainFile)

    window.quiver.files.read(mainFile.path).then((result) => {
      if (result.data !== undefined) {
        setContent(result.data)
        setSavedContent(result.data)
        setDirty(false)
      }
    })
  }, [selectedSkill, setDirty])

  const handleChange = useCallback(
    (value: string | undefined) => {
      const newVal = value ?? ''
      setContent(newVal)
      setDirty(newVal !== savedContent)
    },
    [savedContent, setDirty]
  )

  const handleSave = useCallback(async () => {
    if (!selectedFile) return
    const result = await window.quiver.files.write(selectedFile.path, content)
    if (!result.error) {
      setSavedContent(content)
      setDirty(false)
      setShowCommitDialog(true)
    }
  }, [selectedFile, content, setDirty, setShowCommitDialog])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (!selectedSkill) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">🪶</div>
          <div>Select a skill to edit</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedSkill.name}</span>
          {isDirty && <span className="text-xs text-muted-foreground">● unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-secondary rounded-md overflow-hidden text-xs">
            {(['editor', 'split', 'preview'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 transition-colors ${
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'editor' ? '✏️' : mode === 'split' ? '⬛' : '👁'}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'}>
            <Editor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={content}
              onChange={handleChange}
              options={{
                fontSize: 13,
                lineHeight: 1.6,
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                renderWhitespace: 'none',
                folding: false,
                lineNumbers: 'off',
                glyphMargin: false,
                overviewRulerLanes: 0,
                scrollbar: { verticalScrollbarSize: 6 }
              }}
            />
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={viewMode === 'split' ? 'w-1/2 overflow-y-auto' : 'w-full overflow-y-auto'}>
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {showCommitDialog && selectedSkill && (
        <CommitDialog skillPath={selectedSkill.path} />
      )}
    </div>
  )
}
