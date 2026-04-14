import { useState } from 'react'
import { IconCalendar, IconTrash, IconSwords } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import {
  createMemberBooking,
  deleteMemberBooking,
  BOOKINGS_QUERY_KEY,
  getUpcomingBookings,
  hasConflict,
} from '../../services/BookingService'
import {
  createLadderMatch,
  LADDER_MATCHES_QUERY_KEY,
} from '../../services/LadderService'
import { useToast } from '../../lib/ToastContext'
import type { PendingToolCall } from '../../services/AiChatService'

interface AiConfirmationCardProps {
  toolCall: PendingToolCall
  onConfirm: () => void
  onEdit: () => void
  onClose: () => void
}

function parseDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

export function AiConfirmationCard({
  toolCall,
  onConfirm,
  onEdit,
  onClose,
}: AiConfirmationCardProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [isExecuting, setIsExecuting] = useState(false)
  const [executed, setExecuted] = useState(false)

  const args = toolCall.arguments

  async function handleConfirm() {
    if (!user || isExecuting) return
    setIsExecuting(true)

    try {
      if (toolCall.name === 'create_booking') {
        const start = parseDateTime(
          args.date as string,
          args.startTime as string
        )
        const end = parseDateTime(args.date as string, args.endTime as string)

        // Re-fetch bookings and check for conflicts
        const freshBookings = await getUpcomingBookings()
        if (hasConflict(freshBookings, start, end)) {
          addToast('Tiden blev upptagen. Prova en annan tid.', 'error')
          setIsExecuting(false)
          return
        }

        await createMemberBooking(
          user.uid,
          user.email,
          user.displayName,
          start,
          end
        )
        addToast('Bokning skapad!')
      } else if (toolCall.name === 'create_ladder_match') {
        const start = parseDateTime(
          args.date as string,
          args.startTime as string
        )
        const end = parseDateTime(args.date as string, args.endTime as string)

        const freshBookings = await getUpcomingBookings()
        if (hasConflict(freshBookings, start, end)) {
          addToast('Tiden blev upptagen. Prova en annan tid.', 'error')
          setIsExecuting(false)
          return
        }

        await createLadderMatch(
          args.ladderId as string,
          user.uid,
          args.opponentId as string,
          user.displayName,
          args.opponentName as string,
          user.uid,
          user.email,
          user.displayName,
          start,
          end
        )
        addToast('Stegmatch bokad!')
      } else if (toolCall.name === 'delete_booking') {
        await deleteMemberBooking(args.bookingId as string)
        addToast('Bokning borttagen!')
      }

      await queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      if (toolCall.name === 'create_ladder_match' && args.ladderId) {
        await queryClient.invalidateQueries({
          queryKey: LADDER_MATCHES_QUERY_KEY(args.ladderId as string),
        })
      }
      setExecuted(true)
      onConfirm()
      onClose()
    } catch (err) {
      console.error('Failed to execute tool call:', err)
      addToast('Något gick fel. Försök igen.', 'error')
    } finally {
      setIsExecuting(false)
    }
  }

  if (executed) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {toolCall.name === 'delete_booking'
          ? 'Bokning borttagen'
          : 'Bokning skapad'}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Card content based on tool type */}
      {toolCall.name === 'create_booking' && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconCalendar size={16} stroke={2} />
            Bokningsförslag
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(args.date as string)}, {args.startTime as string} –{' '}
            {args.endTime as string}
          </p>
        </div>
      )}

      {toolCall.name === 'create_ladder_match' && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconSwords size={16} stroke={2} />
            Stegmatch
          </div>
          <p className="text-sm text-gray-600">
            Mot {args.opponentName as string}
          </p>
          <p className="text-sm text-gray-600">
            {formatDate(args.date as string)}, {args.startTime as string} –{' '}
            {args.endTime as string}
          </p>
        </div>
      )}

      {toolCall.name === 'delete_booking' && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconTrash size={16} stroke={2} />
            Ta bort bokning
          </div>
          <p className="text-sm text-gray-600">
            {args.bookingSummary as string}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isExecuting}
          className="min-h-[36px] flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: '#F1E334' }}
        >
          {isExecuting ? 'Utför…' : 'Bekräfta'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={isExecuting}
          className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Ändra
        </button>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
