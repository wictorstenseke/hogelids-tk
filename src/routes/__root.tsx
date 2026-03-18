import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'

export const Route = createRootRoute({
  component: () => (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  ),
})
