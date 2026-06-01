export interface ProfileBookingSyncRule {
  userField: string
  displayNameField: string
}

export const PROFILE_BOOKING_SYNC_RULES: ProfileBookingSyncRule[] = [
  { userField: 'ownerUid', displayNameField: 'ownerDisplayName' },
  { userField: 'opponentUid', displayNameField: 'opponentDisplayName' },
  { userField: 'playerAId', displayNameField: 'playerAName' },
  { userField: 'playerBId', displayNameField: 'playerBName' },
]

export function shouldSyncUpcomingBooking(
  booking: Record<string, unknown>,
  nowMillis: number
): boolean {
  const endTimeMillis = toMillis(booking['endTime'])
  return endTimeMillis !== null && endTimeMillis >= nowMillis
}

function toMillis(value: unknown): number | null {
  if (
    value !== null &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis()
  }
  return null
}
