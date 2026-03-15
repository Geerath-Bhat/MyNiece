import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppTheme = 'light' | 'dark'

interface ThemeState {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (t) => set({ theme: t }),
      toggle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'crybaby-theme' }
  )
)
