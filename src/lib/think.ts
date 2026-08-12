export function parseThink(raw: string): { thinking: string; content: string } {
  let thinking = ''
  let content = raw
  const segments = raw.split(/<think>/)
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1]
    const end = lastSegment.indexOf('</think>')
    if (end !== -1) {
      thinking = lastSegment.substring(0, end)
      content = lastSegment.substring(end + 8)
    } else {
      thinking = lastSegment
      content = ''
    }
  }
  return { thinking, content }
}
