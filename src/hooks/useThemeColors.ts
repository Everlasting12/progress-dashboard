import { useEffect, useState } from 'react'

const read = () => {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return { line: v('--line'), muted: v('--muted'), faint: v('--faint'), ink: v('--ink'), surface: v('--surface'), raised: v('--raised') }
}

/** Resolved CSS colour tokens for SVG charts; updates when the theme class changes. */
export function useThemeColors() {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return colors
}
