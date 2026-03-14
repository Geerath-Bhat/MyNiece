import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Aurora background — fixed, behind everything */}
      <div className="aurora-bg" aria-hidden="true" />

      {/* Page content */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-20 px-4 pt-6 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
