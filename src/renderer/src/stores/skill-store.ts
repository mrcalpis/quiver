import { create } from 'zustand'
import type { Skill } from '../../../types/skill'

interface SkillStore {
  skills: Skill[]
  selectedSkill: Skill | null
  projects: string[]
  isLoading: boolean
  searchQuery: string
  setSkills: (skills: Skill[]) => void
  setSelectedSkill: (skill: Skill | null) => void
  setProjects: (projects: string[]) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  updateSkill: (skill: Skill) => void
  filteredSkills: () => Skill[]
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: [],
  selectedSkill: null,
  projects: [],
  isLoading: false,
  searchQuery: '',

  setSkills: (skills) => set({ skills }),
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setProjects: (projects) => set({ projects }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  updateSkill: (updated) =>
    set((state) => ({
      skills: state.skills.map((s) => (s.id === updated.id ? updated : s)),
      selectedSkill: state.selectedSkill?.id === updated.id ? updated : state.selectedSkill
    })),

  filteredSkills: () => {
    const { skills, searchQuery } = get()
    if (!searchQuery.trim()) return skills
    const q = searchQuery.toLowerCase()
    return skills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  }
}))
