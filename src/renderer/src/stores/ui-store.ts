import { create } from 'zustand'

type ViewMode = 'editor' | 'split' | 'preview'
type ActivePanel = 'main' | 'dashboard' | 'create'

interface UiStore {
  activePanel: ActivePanel
  viewMode: ViewMode
  isDirty: boolean
  showCommitDialog: boolean
  showImportDialog: boolean
  showExportDialog: boolean
  pendingContent: string
  setActivePanel: (panel: ActivePanel) => void
  setViewMode: (mode: ViewMode) => void
  setDirty: (dirty: boolean) => void
  setShowCommitDialog: (show: boolean) => void
  setShowImportDialog: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void
  setPendingContent: (content: string) => void
}

export const useUiStore = create<UiStore>((set) => ({
  activePanel: 'main',
  viewMode: 'split',
  isDirty: false,
  showCommitDialog: false,
  showImportDialog: false,
  showExportDialog: false,
  pendingContent: '',

  setActivePanel: (panel) => set({ activePanel: panel }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setShowCommitDialog: (show) => set({ showCommitDialog: show }),
  setShowImportDialog: (show) => set({ showImportDialog: show }),
  setShowExportDialog: (show) => set({ showExportDialog: show }),
  setPendingContent: (content) => set({ pendingContent: content })
}))
