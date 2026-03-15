import { useAuthStore } from '@/store/authStore'

/**
 * Returns true if the current user is verified or an admin.
 * Unverified members are read-only until an admin verifies them.
 */
export function useCanEdit(): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  return user.is_verified || user.role === 'admin' || user.role === 'super_admin'
}
