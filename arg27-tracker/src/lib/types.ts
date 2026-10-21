/** Part codes are unique within a subteam; the composite ID is globally unique. */
export interface PartDesign {
  id: string
  subteam: string
  subteamCode: string
  code: string
  name: string
  defaultDesigner: string
  active: boolean
}

export type GroupBy = 'partDesign' | 'subteam'
export const GROUP_LABEL: Record<GroupBy, { one: string; many: string; all: string }> = {
  partDesign: { one: 'Part Design', many: 'Part Designs', all: 'All part designs' },
  subteam: { one: 'Subteam', many: 'Subteams', all: 'All subteams' },
}

export const STATUSES = ['Blocked', 'Not Started', 'In Progress', 'In Review', 'Completed'] as const
export type Status = (typeof STATUSES)[number]
export const STATUS_STACK_ORDER: Status[] = [...STATUSES]
export const STATUS_COLOR: Record<Status, string> = {
  Blocked: '#d03b3b',
  'Not Started': '#71767f',
  'In Progress': '#3987e5',
  'In Review': '#86b6ef',
  Completed: '#0ca30c',
}
export const STATUS_WEIGHT: Record<Status, number> = {
  'Not Started': 0,
  Blocked: 0,
  'In Progress': 0.5,
  'In Review': 0.85,
  Completed: 1,
}
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Priority = (typeof PRIORITIES)[number]
export const PRIORITY_COLOR: Record<Priority, string> = {
  Critical: '#d03b3b',
  High: '#ec835a',
  Medium: '#fab219',
  Low: '#71767f',
}
export const PRIORITY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
export const GOAL_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Complete'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]
export const GOAL_STATUS_COLOR: Record<GoalStatus, string> = {
  'On Track': '#0ca30c',
  'At Risk': '#fab219',
  Delayed: '#d03b3b',
  Complete: '#3987e5',
}
export interface Goal {
  id: string
  subteam: string
  sheetId?: string
  title: string
  status: GoalStatus | ''
  successMetric: string
  notes: string
  duplicateOf?: string
}
export interface Task {
  id: string
  subteam: string
  title: string
  partDesignId: string
  /** Display fields resolved from PartDesign when migrated or created. */
  partDesign: string
  designCode: string
  start: string
  due: string
  status: Status
  /** Preserve imported multi-owner assignments without guessing how to split names. */
  owners: string[]
  priority: Priority | ''
  dependsOn: string[]
  deliverable: string
  notes: string
  duplicateOf?: string
}
export type EntityKind = 'goal' | 'task'
export interface ChangeEntry {
  id: string
  at: number
  kind: EntityKind
  entityId: string
  entityTitle: string
  summary: string
  action: 'created' | 'updated' | 'deleted'
}
export interface Dataset {
  schemaVersion: 3
  meta: { source: string; seasonStart: string; seasonEnd: string; competition: string }
  subteams: { code: string; name: string }[]
  partDesigns: PartDesign[]
  groupBy: GroupBy
  groups: { code: string; name: string }[]
  goals: Goal[]
  tasks: Task[]
  log: ChangeEntry[]
  /** High-water marks prevent reuse of deleted or undone task IDs. */
  taskCounters: Record<string, number>
}
export function groupOf(ds: Dataset, t: { partDesign: string; subteam: string }): string {
  return ds.groupBy === 'subteam' ? t.subteam : t.partDesign
}
export function groupCode(ds: Dataset, name: string): string {
  return ds.groups.find((g) => g.name === name)?.code ?? '??'
}
