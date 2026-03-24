import { useUiStore } from '../../stores/ui-store'
import SkillTree from '../sidebar/SkillTree'
import SkillEditor from '../editor/SkillEditor'
import SkillDetail from '../detail/SkillDetail'
import Dashboard from '../dashboard/Dashboard'
import NewSkillWizard from '../create/NewSkillWizard'
import ImportDialog from '../import-export/ImportDialog'
import ExportDialog from '../import-export/ExportDialog'

export default function AppLayout() {
  const { activePanel, showImportDialog, showExportDialog } = useUiStore()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Title bar drag region */}
      <div className="h-8 drag-region bg-background/80 flex items-center px-20 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground no-drag">Quiver</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden border-t border-border">
        {/* Sidebar */}
        <div className="w-60 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <SkillTree />
        </div>

        {/* Center panel */}
        <div className="flex-1 overflow-hidden">
          {activePanel === 'main' && <SkillEditor />}
          {activePanel === 'dashboard' && <Dashboard />}
          {activePanel === 'create' && <NewSkillWizard />}
        </div>

        {/* Right detail panel */}
        {activePanel === 'main' && (
          <div className="w-72 shrink-0 border-l border-border overflow-hidden">
            <SkillDetail />
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showImportDialog && <ImportDialog />}
      {showExportDialog && <ExportDialog />}
    </div>
  )
}
