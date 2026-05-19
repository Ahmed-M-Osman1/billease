import { create } from 'zustand'
import type { Profile } from '@/lib/types'

// Minimal user shape — compatible with next-auth session.user
interface User {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface AuthStoreState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthStoreActions {
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>()((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAuth: () =>
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}))
