export function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'E-postadressen används redan.'
    case 'auth/invalid-credential':
      return 'Felaktig e-post eller lösenord.'
    case 'auth/weak-password':
      return 'Lösenordet måste vara minst 6 tecken.'
    case 'auth/too-many-requests':
      return 'För många försök. Försök igen senare.'
    case 'auth/operation-not-allowed':
      return 'Inloggning med e-post är inte aktiverat.'
    default:
      return 'Något gick fel. Försök igen.'
  }
}

export function getErrorCode(err: unknown): string {
  if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code
  }
  return ''
}
