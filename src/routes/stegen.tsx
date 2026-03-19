import { createFileRoute } from '@tanstack/react-router'
import { StegenPage } from './-components/StegenPage'

export const Route = createFileRoute('/stegen')({
  component: StegenPage,
})
