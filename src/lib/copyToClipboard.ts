/**
 * Copy text to the clipboard with iOS Safari compatibility.
 * Prefer execCommand in the same synchronous turn as the user gesture — async Clipboard API
 * often fails on iPhone Safari even after a tap.
 */
function copyWithExecCommand(text: string): boolean {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.width = '1px'
  el.style.height = '1px'
  el.style.padding = '0'
  el.style.margin = '0'
  el.style.border = 'none'
  el.style.outline = 'none'
  el.style.boxShadow = 'none'
  el.style.background = 'transparent'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    document.body.removeChild(el)
  }
  return ok
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (copyWithExecCommand(text)) {
    return true
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    return false
  }
  return false
}
