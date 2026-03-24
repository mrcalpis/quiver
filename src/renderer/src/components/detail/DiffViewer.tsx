import type { DiffResult } from '../../../../types/git'

interface Props {
  diff: DiffResult
  onClose: () => void
}

function computeLineDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: Array<{ type: 'add' | 'remove' | 'context'; content: string }> = []

  // Simple LCS-based diff
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  let i = 0
  let j = 0
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: 'context', content: oldLines[i] })
      i++
      j++
    } else if (j < n && (i >= m || dp[i + 1][j] <= dp[i][j + 1])) {
      result.push({ type: 'add', content: newLines[j] })
      j++
    } else {
      result.push({ type: 'remove', content: oldLines[i] })
      i++
    }
  }

  return result
}

export default function DiffViewer({ diff, onClose }: Props) {
  const lines = computeLineDiff(diff.oldContent, diff.newContent)
  const hasChanges = lines.some((l) => l.type !== 'context')

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-full flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold">Diff View</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 font-mono text-xs">
          {!hasChanges ? (
            <div className="p-6 text-center text-muted-foreground">No changes between these versions</div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => {
                  if (line.type === 'context' && line.content === '') return null
                  return (
                    <tr
                      key={i}
                      className={
                        line.type === 'add'
                          ? 'bg-green-500/10'
                          : line.type === 'remove'
                            ? 'bg-red-500/10'
                            : ''
                      }
                    >
                      <td className="w-6 px-2 text-muted-foreground select-none border-r border-border text-center">
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                      </td>
                      <td
                        className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                          line.type === 'add'
                            ? 'text-green-400'
                            : line.type === 'remove'
                              ? 'text-red-400'
                              : 'text-foreground/80'
                        }`}
                      >
                        {line.content}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
