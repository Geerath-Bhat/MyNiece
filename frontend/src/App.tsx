import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/Auth/Login'
import Register from '@/pages/Auth/Register'
import DashboardPage from '@/pages/Dashboard/index'
import ActivityLogPage from '@/pages/ActivityLog/index'
import RemindersPage from '@/pages/Reminders/index'
import VoicePage from '@/pages/Voice/index'
import SleepPage from '@/pages/Sleep/index'
import AnalyticsPage from '@/pages/Analytics/index'
import ExpensesPage from '@/pages/Expenses/index'
import MorePage from '@/pages/More/index'
import SettingsPage from '@/pages/Settings/index'
import AdminPage from '@/pages/Admin/index'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function ThemeSync() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <ToastContainer />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — inside AppShell */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/log" element={<ActivityLogPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
