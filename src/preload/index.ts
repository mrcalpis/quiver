import { contextBridge, ipcRenderer } from 'electron'

const quiverAPI = {
  skills: {
    scanAll: () => ipcRenderer.invoke('skills:scanAll'),
    addProject: (path: string) => ipcRenderer.invoke('skills:addProject', path),
    removeProject: (path: string) => ipcRenderer.invoke('skills:removeProject', path)
  },
  files: {
    read: (path: string) => ipcRenderer.invoke('files:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('files:write', path, content),
    createSkill: (options: unknown) => ipcRenderer.invoke('files:createSkill', options),
    deleteSkill: (skillId: string) => ipcRenderer.invoke('files:deleteSkill', skillId),
    exportSkill: (skillId: string, destPath: string) =>
      ipcRenderer.invoke('files:exportSkill', skillId, destPath),
    importSkill: (srcPath: string, scope: string, projectPath?: string) =>
      ipcRenderer.invoke('files:importSkill', srcPath, scope, projectPath),
    openFilePicker: (options: unknown) => ipcRenderer.invoke('files:openFilePicker', options),
    openFolderPicker: () => ipcRenderer.invoke('files:openFolderPicker'),
    saveFilePicker: (options: unknown) => ipcRenderer.invoke('files:saveFilePicker', options)
  },
  git: {
    commit: (skillPath: string, message: string) =>
      ipcRenderer.invoke('git:commit', skillPath, message),
    history: (skillPath: string) => ipcRenderer.invoke('git:history', skillPath),
    diff: (skillPath: string, oid1: string, oid2: string) =>
      ipcRenderer.invoke('git:diff', skillPath, oid1, oid2),
    rollback: (skillPath: string, oid: string) =>
      ipcRenderer.invoke('git:rollback', skillPath, oid)
  },
  quality: {
    analyze: (skillId: string) => ipcRenderer.invoke('quality:analyze', skillId)
  },
  usage: {
    getStats: (days?: number) => ipcRenderer.invoke('usage:getStats', days),
    installHook: () => ipcRenderer.invoke('usage:installHook'),
    removeHook: () => ipcRenderer.invoke('usage:removeHook'),
    isHookInstalled: () => ipcRenderer.invoke('usage:isHookInstalled')
  },
  on: (event: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(event, (_event, ...args) => callback(...args))
  },
  off: (event: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(event, callback as never)
  }
}

contextBridge.exposeInMainWorld('quiver', quiverAPI)

export type QuiverAPI = typeof quiverAPI
