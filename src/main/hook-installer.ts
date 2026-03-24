import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')
const QUIVER_DIR = join(homedir(), '.quiver')
const HOOKS_DIR = join(QUIVER_DIR, 'hooks')
const HOOK_MARKER = '# quiver-managed'

const TRACK_PROMPT_SCRIPT = `#!/bin/bash
${HOOK_MARKER}
# Tracks /skill-name invocations from UserPromptSubmit hook
PROMPT=$(cat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prompt',''))" 2>/dev/null)
if [[ "$PROMPT" =~ ^/([a-zA-Z0-9_-]+) ]]; then
  SKILL_NAME="\${BASH_REMATCH[1]}"
  BUFFER="$HOME/.quiver/usage-buffer.jsonl"
  echo '{"skillName":"'$SKILL_NAME'","invokedAt":'$(date +%s000)',"source":"slash-command"}' >> "$BUFFER"
fi
`

export function installHook(): void {
  // Write hook script
  if (!existsSync(HOOKS_DIR)) mkdirSync(HOOKS_DIR, { recursive: true })
  const scriptPath = join(HOOKS_DIR, 'track-prompt.sh')
  writeFileSync(scriptPath, TRACK_PROMPT_SCRIPT)

  // Update Claude Code settings.json
  let settings: Record<string, unknown> = {}
  if (existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'))
    } catch {
      settings = {}
    }
  }

  const hooks = (settings.hooks as Record<string, unknown[]>) || {}
  const promptHooks = (hooks.UserPromptSubmit as unknown[]) || []

  // Check if already installed
  const alreadyInstalled = promptHooks.some(
    (h) =>
      JSON.stringify(h).includes('track-prompt.sh')
  )

  if (!alreadyInstalled) {
    promptHooks.push({
      hooks: [
        {
          type: 'command',
          command: `bash ~/.quiver/hooks/track-prompt.sh`
        }
      ]
    })
    hooks.UserPromptSubmit = promptHooks
    settings.hooks = hooks

    const claudeDir = join(homedir(), '.claude')
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true })
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  }
}

export function removeHook(): void {
  if (!existsSync(SETTINGS_PATH)) return
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) as Record<string, unknown>
    const hooks = (settings.hooks as Record<string, unknown[]>) || {}

    if (hooks.UserPromptSubmit) {
      hooks.UserPromptSubmit = (hooks.UserPromptSubmit as unknown[]).filter(
        (h) => !JSON.stringify(h).includes('track-prompt.sh')
      )
      settings.hooks = hooks
      writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    }
  } catch {
    // ignore
  }
}

export function isHookInstalled(): boolean {
  if (!existsSync(SETTINGS_PATH)) return false
  try {
    const content = readFileSync(SETTINGS_PATH, 'utf-8')
    return content.includes('track-prompt.sh')
  } catch {
    return false
  }
}
