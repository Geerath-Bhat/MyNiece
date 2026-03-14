import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserOut } from '@/api/auth'

interface AuthState {
  token: string | null
  user: UserOut | null
  activeBabyId: string | null
  setAuth: (token: string, user: UserOut) => void
  setActiveBabyId: (id: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeBabyId: null,
      setAuth: (token, user) => {
        localStorage.setItem('crybaby_token', token)
        set({ token, user })
      },
      setActiveBabyId: (id) => set({ activeBabyId: id }),
      logout: () => {
        localStorage.removeItem('crybaby_token')
        set({ token: null, user: null, activeBabyId: null })
      },
    }),
    {
      name: 'crybaby-auth',
      partialize: (s) => ({ token: s.token, user: s.user, activeBabyId: s.activeBabyId }),
    }
  )
)
