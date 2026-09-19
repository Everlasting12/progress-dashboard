/* Small inline icon set (stroke icons, 20px grid) so we don't need an icon library. */
const paths = {
  home: 'M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z',
  grid: 'M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z',
  chart: 'M3.5 16.5h13M6 13.5V9M10 13.5V5.5M14 13.5v-6',
  history: 'M3.5 10a6.5 6.5 0 1 0 2-4.7M3.5 3.5v2.5H6M10 6.5V10l2.5 1.5',
  settings:
    'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16 10c0-.5 0-1-.2-1.4l1.5-1.2-1.5-2.6-1.8.7a6 6 0 0 0-2.4-1.4L11.3 2H8.7l-.3 2.1A6 6 0 0 0 6 5.5l-1.8-.7-1.5 2.6 1.5 1.2a6 6 0 0 0 0 2.8l-1.5 1.2 1.5 2.6 1.8-.7a6 6 0 0 0 2.4 1.4l.3 2.1h2.6l.3-2.1a6 6 0 0 0 2.4-1.4l1.8.7 1.5-2.6-1.5-1.2c.1-.4.2-.9.2-1.4Z',
  plus: 'M10 4v12M4 10h12',
  minus: 'M4 10h12',
  x: 'M5 5l10 10M15 5 5 15',
  check: 'M4 10.5 8 14.5 16 5.5',
  chevronLeft: 'M12 4.5 6.5 10l5.5 5.5',
  chevronRight: 'M8 4.5 13.5 10 8 15.5',
  edit: 'M12.5 4.5l3 3L7 16H4v-3zM11 6l3 3',
  trash: 'M4.5 6h11M8 6V4h4v2M6 6l.7 10h6.6L14 6',
  copy: 'M7 7h9v9H7zM4 13V4h9',
  sync: 'M16 7a6.5 6.5 0 0 0-11.5-1.5M4 13a6.5 6.5 0 0 0 11.5 1.5M4 3v3.5h3.5M16 17v-3.5h-3.5',
  cloudOff: 'M3 3l14 14M8 5.3A5 5 0 0 1 15 9a3.5 3.5 0 0 1 2 5.8M14 15H6a4 4 0 0 1-1.3-7.8',
  info: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM10 9.5v4M10 6.8v.2',
  alert: 'M10 3.5 17.5 16.5h-15zM10 8.5v3.5M10 14.3v.2',
  star: 'M10 3l2.1 4.4 4.8.6-3.5 3.3.9 4.7L10 13.8 5.7 16l.9-4.7L3.1 8l4.8-.6z',
  download: 'M10 3.5v9M6 9l4 4 4-4M4 16.5h12',
  upload: 'M10 13.5v-9M6 8l4-4 4 4M4 16.5h12',
  calendar: 'M4 5.5h12v11H4zM4 9h12M7.5 3.5v3M12.5 3.5v3',
  arrowUp: 'M10 16V4M5.5 8.5 10 4l4.5 4.5',
  arrowDown: 'M10 4v12M5.5 11.5 10 16l4.5-4.5',
  eye: 'M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5ZM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  eyeOff: 'M3 3l14 14M8.2 5.3A7 7 0 0 1 10 5c4.8 0 7.5 5 7.5 5a12 12 0 0 1-2 2.6M5.3 6.8A12 12 0 0 0 2.5 10s2.7 5 7.5 5a7 7 0 0 0 3-.7',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={paths[name]} />
    </svg>
  )
}
