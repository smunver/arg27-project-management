import seed from '../data/seed.json'
import { taskFromDraft, type TaskDraft } from './domain'
import { migrateDataset } from './migrate'
import type { ChangeEntry, Dataset, EntityKind, Goal, PartDesign, Task } from './types'

export const STORAGE_KEY = 'arg27-tracker:v3'
export const LEGACY_STORAGE_KEY = 'arg27-tracker:v2'
export interface DataAdapter {
  read(): Dataset
  createTask(draft: TaskDraft): Task
  updateTask(id: string, patch: Partial<Task>): void
  updatePartDesign(id: string, patch: Pick<PartDesign, 'defaultDesigner'>): void
  createGoal(draft: Partial<Goal>): Goal
  updateGoal(id: string, patch: Partial<Goal>): void
  remove(kind: EntityKind, id: string): void
  replace(next: Dataset): void
  reset(): void
}
interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Browser-local mock only. It offers no cross-browser or server concurrency guarantees. */
export function createMockAdapter(
  options: { initial?: unknown; storage?: Storage } = {},
): DataAdapter {
  const { storage } = options
  const saved = storage?.getItem(STORAGE_KEY) ?? storage?.getItem(LEGACY_STORAGE_KEY)
  let data = migrateDataset(options.initial ?? (saved ? JSON.parse(saved) : seed))
  let sequence = 0
  function commit(next: Dataset) {
    // Persist the canonical schema without touching the v2 recovery copy.
    storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    data = structuredClone(next)
  }
  function log(
    kind: EntityKind,
    id: string,
    title: string,
    action: ChangeEntry['action'],
    summary: string,
  ): ChangeEntry[] {
    return [
      {
        id: `c${Date.now()}-${sequence++}`,
        at: Date.now(),
        kind,
        entityId: id,
        entityTitle: title,
        action,
        summary,
      },
      ...data.log,
    ].slice(0, 300)
  }
  function validateDependencies(id: string, deps: string[]) {
    if (new Set(deps).size !== deps.length)
      throw new Error('Duplicate dependencies are not allowed.')
    const byId = new Map(data.tasks.map((t) => [t.id, t]))
    for (const dep of deps) {
      if (!byId.has(dep)) throw new Error(`Unknown dependency: ${dep}`)
      const visited = new Set<string>()
      const reaches = (current: string): boolean => {
        if (current === id) return true
        if (visited.has(current)) return false
        visited.add(current)
        return (byId.get(current)?.dependsOn ?? []).some(reaches)
      }
      if (reaches(dep))
        throw new Error('A task cannot depend on itself or create a dependency cycle.')
    }
  }
  return {
    read: () => structuredClone(data),
    createTask(draft) {
      // Allocate from current adapter state, never from a scoped or stale React render.
      const prefix = draft.partDesignId
      const number = (data.taskCounters[prefix] ?? 0) + 1
      const id = `${prefix}_T${String(number).padStart(3, '0')}`
      const task = taskFromDraft(data, draft, id)
      validateDependencies(id, task.dependsOn)
      commit({
        ...data,
        tasks: [...data.tasks, task],
        taskCounters: { ...data.taskCounters, [prefix]: number },
        log: log('task', id, task.title, 'created', `Created in ${task.partDesign}`),
      })
      return structuredClone(task)
    },
    updateTask(id, patch) {
      const task = data.tasks.find((t) => t.id === id)
      if (!task) throw new Error('Task no longer exists.')
      // Moving a task requires a future transactional operation; never re-key imported IDs.
      for (const key of ['id', 'subteam', 'partDesignId', 'partDesign', 'designCode'] as const)
        if (patch[key] !== undefined && patch[key] !== task[key])
          throw new Error('Task ID, subteam and part design are locked after creation.')
      if (patch.dependsOn) validateDependencies(id, patch.dependsOn)
      if (patch.title !== undefined && !patch.title.trim()) throw new Error('Enter a task title.')
      const next = { ...task, ...patch }
      if (JSON.stringify(next) === JSON.stringify(task)) return
      commit({
        ...data,
        tasks: data.tasks.map((t) => (t.id === id ? next : t)),
        log: log('task', id, next.title, 'updated', Object.keys(patch).join(', ') + ' updated'),
      })
    },
    updatePartDesign(id, patch) {
      if (!data.partDesigns.some((p) => p.id === id))
        throw new Error('Part design no longer exists.')
      commit({
        ...data,
        partDesigns: data.partDesigns.map((p) =>
          p.id === id ? { ...p, defaultDesigner: patch.defaultDesigner.trim() } : p,
        ),
      })
    },
    createGoal(draft) {
      const team = data.subteams.find((s) => s.name === draft.subteam)
      if (!team) throw new Error('Choose a subteam.')
      const prefix = `${team.code}_G`
      const max = Math.max(
        0,
        ...data.goals
          .filter((g) => g.id.startsWith(prefix))
          .map((g) => Number(g.id.slice(prefix.length)) || 0),
      )
      const goal: Goal = {
        id: `${prefix}${String(max + 1).padStart(3, '0')}`,
        subteam: team.name,
        title: draft.title || 'Untitled goal',
        status: draft.status ?? 'On Track',
        successMetric: draft.successMetric ?? '',
        notes: draft.notes ?? '',
      }
      commit({
        ...data,
        goals: [...data.goals, goal],
        log: log('goal', goal.id, goal.title, 'created', 'Created'),
      })
      return goal
    },
    updateGoal(id, patch) {
      const goal = data.goals.find((g) => g.id === id)
      if (!goal) throw new Error('Goal no longer exists.')
      if (patch.id && patch.id !== id) throw new Error('Goal IDs cannot be changed.')
      commit({
        ...data,
        goals: data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        log: log('goal', id, goal.title, 'updated', Object.keys(patch).join(', ') + ' updated'),
      })
    },
    remove(kind, id) {
      if (kind === 'task' && data.tasks.some((t) => t.dependsOn.includes(id)))
        throw new Error('Remove inbound task dependencies before deleting this task.')
      const item = (kind === 'task' ? data.tasks : data.goals).find((i) => i.id === id)
      if (!item) return
      commit({
        ...data,
        tasks: kind === 'task' ? data.tasks.filter((t) => t.id !== id) : data.tasks,
        goals: kind === 'goal' ? data.goals.filter((g) => g.id !== id) : data.goals,
        log: log(kind, id, item.title, 'deleted', 'Deleted'),
      })
    },
    replace(next) {
      const restored = migrateDataset(next)
      for (const [prefix, max] of Object.entries(data.taskCounters))
        restored.taskCounters[prefix] = Math.max(restored.taskCounters[prefix] ?? 0, max)
      commit(restored)
    },
    reset() {
      commit(migrateDataset(seed))
    },
  }
}
