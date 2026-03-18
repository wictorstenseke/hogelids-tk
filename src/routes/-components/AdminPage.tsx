import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const role = useRole()
  const navigate = useNavigate()

  const isAdmin = isAdminRole(role)
  // Still loading auth or waiting for role to resolve
  const isLoading = authLoading || (!!user && role === null)

  useEffect(() => {
    if (isLoading) return
    if (!user || !isAdmin) {
      void navigate({ to: '/', replace: true })
    }
  }, [user, isAdmin, isLoading, navigate])

  if (isLoading) return null

  if (!user || !isAdmin) return null

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
    </main>
  )
}
