export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36)}${rand}`
}

export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
      .replace(/^[A-Z]/, (c) => c.toLowerCase()) || 'metric'
  )
}

/** A camelCase id derived from a name, unique among `taken`. */
export function uniqueId(name: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  const base = slugify(name)
  let id = base
  let n = 2
  while (set.has(id)) id = `${base}${n++}`
  return id
}
