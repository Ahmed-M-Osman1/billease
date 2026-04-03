import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemePreference } from '@/lib/types'

interface UIStoreState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: ThemePreference
}

interface UIStoreActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: ThemePreference) => void
}

export const useUIStore = create<UIStoreState & UIStoreActions>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      theme: 'system',

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'billease-ui',
    }
  )
)
