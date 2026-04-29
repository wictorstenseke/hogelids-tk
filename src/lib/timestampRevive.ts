import { Timestamp } from 'firebase/firestore'

export function reviveTimestamps(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as Record<string, unknown>).seconds === 'number' &&
    typeof (value as Record<string, unknown>).nanoseconds === 'number'
  ) {
    return new Timestamp(
      (value as { seconds: number }).seconds,
      (value as { nanoseconds: number }).nanoseconds
    )
  }
  return value
}
