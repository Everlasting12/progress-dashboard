import type { AppSettings, Dashboard, Metric, Snapshot } from '../types'
import { TOTAL_METRIC_ID } from './constants'

const EPOCH = '1970-01-01T00:00:00.000Z'

function metric(id: string, name: string, type: Metric['type'], unit: string, includeInTotal: boolean, step = 1): Metric {
  return { id, name, type, unit, includeInTotal, step }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  dateFormat: 'MMM d, yyyy',
  weekStart: 0,
  timezone: 'Asia/Kolkata',
  defaultDashboardId: 'dsa',
  streakGraceDays: 0,
  updatedAt: EPOCH,
}

export const DEFAULT_DSA: Dashboard = {
  id: 'dsa',
  name: 'DSA',
  description: 'Daily data structures and algorithms practice',
  icon: '🧠',
  color: '#2f9e76',
  metrics: [
    metric('problemsSolved', 'Problems solved', 'count', 'problems', true),
    metric('easy', 'Easy', 'count', '', false),
    metric('medium', 'Medium', 'count', '', false),
    metric('hard', 'Hard', 'count', '', false),
    metric('studyHours', 'Study hours', 'duration', 'h', true, 0.5),
  ],
  threshold: { metricId: 'problemsSolved', min: 1 },
  createdAt: EPOCH,
  updatedAt: EPOCH,
}

export function emptySnapshot(): Snapshot {
  return {
    dashboards: { version: 1, dashboards: [DEFAULT_DSA] },
    activity: { version: 1, entries: {} },
    settings: { version: 1, settings: { ...DEFAULT_SETTINGS } },
  }
}

export type DashboardTemplate = Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>

export const TEMPLATES: { label: string; template: DashboardTemplate }[] = [
  {
    label: 'Blank',
    template: {
      name: '',
      description: '',
      icon: '✨',
      color: '#5b6ee1',
      metrics: [metric('amount', 'Amount', 'count', '', true)],
      threshold: { metricId: 'amount', min: 1 },
    },
  },
  {
    label: 'LeetCode',
    template: {
      name: 'LeetCode',
      description: 'Problems and contests on LeetCode',
      icon: '💻',
      color: '#d98b1f',
      metrics: [
        metric('problemsSolved', 'Problems solved', 'count', 'problems', true),
        metric('easy', 'Easy', 'count', '', false),
        metric('medium', 'Medium', 'count', '', false),
        metric('hard', 'Hard', 'count', '', false),
        metric('contest', 'Contest', 'boolean', '', false),
      ],
      threshold: { metricId: 'problemsSolved', min: 1 },
    },
  },
  {
    label: 'Learning',
    template: {
      name: 'Java learning',
      description: 'Courses, docs and practice',
      icon: '☕',
      color: '#c4553b',
      metrics: [
        metric('hours', 'Hours', 'duration', 'h', true, 0.5),
        metric('lessons', 'Lessons', 'count', 'lessons', false),
      ],
      threshold: { metricId: 'hours', min: 0.5 },
    },
  },
  {
    label: 'Fitness',
    template: {
      name: 'Fitness',
      description: 'Workouts and movement',
      icon: '🏃',
      color: '#2f7fd1',
      metrics: [
        metric('minutes', 'Workout minutes', 'count', 'min', true, 5),
        metric('steps', 'Steps', 'count', 'steps', false, 500),
        metric('distance', 'Distance', 'decimal', 'km', false, 0.5),
      ],
      threshold: { metricId: 'minutes', min: 20 },
    },
  },
  {
    label: 'Reading',
    template: {
      name: 'Reading',
      description: 'Books and long-form articles',
      icon: '📚',
      color: '#8a5cc7',
      metrics: [
        metric('pages', 'Pages', 'count', 'pages', true, 5),
        metric('minutes', 'Minutes', 'count', 'min', false, 5),
      ],
      threshold: { metricId: 'pages', min: 10 },
    },
  },
  {
    label: 'Projects',
    template: {
      name: 'Personal projects',
      description: 'Side projects and commits',
      icon: '🛠️',
      color: '#1f9aa3',
      metrics: [
        metric('hours', 'Hours', 'duration', 'h', true, 0.5),
        metric('commits', 'Commits', 'count', 'commits', false),
      ],
      threshold: { metricId: TOTAL_METRIC_ID, min: 0.5 },
    },
  },
]

export const ICONS = ['🧠', '💻', '☕', '🏃', '📚', '🛠️', '🐙', '🧮', '🎯', '📝', '🎸', '🧘', '🌱', '🚀', '⚡', '🏋️', '🧪', '🎨', '🗣️', '💤']
export const COLORS = ['#2f9e76', '#2f7fd1', '#5b6ee1', '#8a5cc7', '#c24f8f', '#c4553b', '#d98b1f', '#1f9aa3', '#6b7a8f']
