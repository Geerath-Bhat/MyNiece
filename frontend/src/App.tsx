import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/Auth/Login'
import Register from '@/pages/Auth/Register'
import DashboardPage from '@/pages/Dashboard/index'
import ActivityLogPage from '@/pages/ActivityLog/index'
import RemindersPage from '@/pages/Reminders/index'
import VoicePage from '@/pages/Voice/index'
import SettingsPage from '@/pages/Settings/index'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="/more" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
