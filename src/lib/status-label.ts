export function formatStatusLabel(status: string) {
  const words = status
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return '-'
  }

  return words
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ')
}
