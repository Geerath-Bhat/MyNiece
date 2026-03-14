import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Page content — padded above bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
