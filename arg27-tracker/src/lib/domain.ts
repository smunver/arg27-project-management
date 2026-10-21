import { STATUSES, type Dataset, type PartDesign, type Status, type Task } from './types'

export const ALL_TEAMS = '__all__'
export interface Scope {
  subteam: string
  partDesignId: string
}
export type TaskDraft = Pick<Task, 'subteam' | 'partDesignId' | 'title'> &
  Partial<
    Pick<
      Task,
      'owners' | 'status' | 'priority' | 'start' | 'due' | 'dependsOn' | 'deliverable' | 'notes'
    >
  >

export function normalizeStatus(value: string): Status {
  if (value === 'Complete') return 'Completed'
  if (value === 'Planned' || !value) return 'Not Started'
  if ((STATUSES as readonly string[]).includes(value)) return value as Status
  throw new Error(`Unknown task status: ${value}`)
}
export function designsFor(ds: Dataset, subteam: string): PartDesign[] {
  return ds.partDesigns.filter((p) => p.active && p.subteam === subteam)
}
export function scopeTo(all: Dataset, subteam: string, partDesignId = ''): Dataset {
  if (subteam === ALL_TEAMS) return { ...all, groupBy: 'subteam', groups: all.subteams }
  // An invalid/stale design selection must never hide another subteam's tasks.
  const design = all.partDesigns.find((p) => p.id === partDesignId && p.subteam === subteam)
  const partDesigns = all.partDesigns.filter(
    (p) => p.subteam === subteam && (!design || p.id === design.id),
  )
  const tasks = all.tasks.filter(
    (t) => t.subteam === subteam && (!design || t.partDesignId === design.id),
  )
  const visibleIds = new Set(
    [...tasks, ...all.goals.filter((g) => g.subteam === subteam)].map((i) => i.id),
  )
  return {
    ...all,
    groupBy: 'partDesign',
    groups: partDesigns,
    partDesigns,
    tasks,
    goals: all.goals.filter((g) => g.subteam === subteam),
    log: all.log.filter((l) => visibleIds.has(l.entityId)),
  }
}
export function filterTasks(
  tasks: Task[],
  filters: { owner?: string; status?: Status | ''; priority?: string; query?: string },
) {
  const needle = filters.query?.trim().toLowerCase()
  return tasks.filter(
    (t) =>
      (!filters.owner || t.owners.includes(filters.owner)) &&
      (!filters.status || t.status === filters.status) &&
      (!filters.priority || t.priority === filters.priority) &&
      (!needle ||
        [t.id, t.title, t.partDesign, t.deliverable, t.notes, ...t.owners]
          .join(' ')
          .toLowerCase()
          .includes(needle)),
  )
}
/** No IDs are allocated and no adapter writes occur while this is a draft. */
export function selectDraftDesign(ds: Dataset, draft: TaskDraft, id: string): TaskDraft {
  const design = designsFor(ds, draft.subteam).find((p) => p.id === id)
  return {
    ...draft,
    partDesignId: design?.id ?? '',
    owners: design?.defaultDesigner ? [design.defaultDesigner] : [],
  }
}
export function taskFromDraft(ds: Dataset, draft: TaskDraft, id: string): Task {
  const design = designsFor(ds, draft.subteam).find((p) => p.id === draft.partDesignId)
  if (!design) throw new Error('Choose a part design belonging to the selected subteam.')
  if (!draft.title.trim()) throw new Error('Enter a task title.')
  if (draft.start && draft.due && draft.start > draft.due)
    throw new Error('Start must be on or before due date.')
  return {
    id,
    subteam: design.subteam,
    partDesignId: design.id,
    partDesign: design.name,
    designCode: design.code,
    title: draft.title.trim(),
    status: normalizeStatus(draft.status ?? 'Not Started'),
    owners: [...(draft.owners ?? (design.defaultDesigner ? [design.defaultDesigner] : []))],
    start: draft.start ?? '',
    due: draft.due ?? '',
    priority: draft.priority ?? '',
    dependsOn: [...(draft.dependsOn ?? [])],
    deliverable: draft.deliverable ?? '',
    notes: draft.notes ?? '',
  }
}
