import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export function AppShell() {
  return (
    <div className="flex min-h-screen relative">
      {/* Aurora background — fixed, behind everything */}
      <div className="aurora-bg" aria-hidden="true" />

      <OfflineBanner />

      {/* Sidebar — tablet (md) icon-only, desktop (lg) labeled */}
      <SideNav />

      {/* Main area — shifts right on md+ to make room for sidebar */}
      <div className="flex flex-col flex-1 min-h-screen md:ml-16 lg:ml-56">
        <main className="
          relative z-10 flex-1 overflow-y-auto
          px-4 pt-6 pb-24
          md:px-8 md:pt-8 md:pb-8
          w-full max-w-3xl mx-auto
        ">
          <Outlet />
        </main>

        {/* Bottom nav — mobile only */}
        <BottomNav />
      </div>
    </div>
  )
}
