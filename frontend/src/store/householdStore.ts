import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HouseholdOut } from '@/api/auth'

interface HouseholdState {
  selectedHousehold: HouseholdOut | null
  setSelectedHousehold: (h: HouseholdOut | null) => void
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      selectedHousehold: null,
      setSelectedHousehold: (h) => set({ selectedHousehold: h }),
    }),
    {
      name: 'crybaby-household',
      partialize: (s) => ({ selectedHousehold: s.selectedHousehold }),
    }
  )
)
