import { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import { useSkillStore } from './stores/skill-store'

declare global {
  interface Window {
    quiver: {
      skills: {
        scanAll: () => Promise<{ data?: unknown[]; error?: string }>
        addProject: (path: string) => Promise<{ data?: unknown[]; error?: string }>
        removeProject: (path: string) => Promise<{ data?: boolean; error?: string }>
      }
      files: {
        read: (path: string) => Promise<{ data?: string; error?: string }>
        write: (path: string, content: string) => Promise<{ data?: boolean; error?: string }>
        createSkill: (options: unknown) => Promise<{ data?: unknown; error?: string }>
        deleteSkill: (id: string) => Promise<{ data?: boolean; error?: string }>
        exportSkill: (id: string, destPath: string) => Promise<{ data?: boolean; error?: string }>
        importSkill: (srcPath: string, scope: string, projectPath?: string) => Promise<{ data?: unknown; error?: string }>
        openFilePicker: (options: unknown) => Promise<{ data?: unknown }>
        openFolderPicker: () => Promise<{ data?: unknown }>
        saveFilePicker: (options: unknown) => Promise<{ data?: unknown }>
      }
      git: {
        commit: (skillPath: string, message: string) => Promise<{ data?: string; error?: string }>
        history: (skillPath: string) => Promise<{ data?: unknown[]; error?: string }>
        diff: (skillPath: string, oid1: string, oid2: string) => Promise<{ data?: unknown; error?: string }>
        rollback: (skillPath: string, oid: string) => Promise<{ data?: boolean; error?: string }>
      }
      quality: {
        analyze: (id: string) => Promise<{ data?: unknown; error?: string }>
      }
      usage: {
        getStats: (days?: number) => Promise<{ data?: unknown[]; error?: string }>
        installHook: () => Promise<{ data?: boolean; error?: string }>
        removeHook: () => Promise<{ data?: boolean; error?: string }>
        isHookInstalled: () => Promise<{ data?: boolean; error?: string }>
      }
      on: (event: string, callback: (...args: unknown[]) => void) => void
      off: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

export default function App() {
  const { setSkills, setLoading } = useSkillStore()

  useEffect(() => {
    async function loadSkills() {
      setLoading(true)
      const result = await window.quiver.skills.scanAll()
      if (result.data) {
        setSkills(result.data as never[])
      }
      setLoading(false)
    }

    loadSkills()

    const handleSkillChanged = () => {
      loadSkills()
    }

    window.quiver.on('skill:changed', handleSkillChanged)
    return () => window.quiver.off('skill:changed', handleSkillChanged)
  }, [setSkills, setLoading])

  return <AppLayout />
}
