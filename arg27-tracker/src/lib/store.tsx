import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createMockAdapter, type DataAdapter } from './adapter'
import { ALL_TEAMS, scopeTo, type TaskDraft } from './domain'
import type { Dataset, EntityKind, Goal, PartDesign, Task } from './types'
export { ALL_TEAMS } from './domain'

const SUBTEAM_KEY = 'arg27-tracker:subteam'
interface StoreValue {
  ds: Dataset
  all: Dataset
  subteam: string
  subteams: Dataset['subteams']
  setSubteam(name: string): void
  partDesignId: string
  setPartDesignId(id: string): void
  clearScope(): void
  isAllTeams: boolean
  updateTask(id: string, patch: Partial<Task>): void
  updatePartDesign(id: string, patch: Pick<PartDesign, 'defaultDesigner'>): void
  updateGoal(id: string, patch: Partial<Goal>): void
  createTask(draft: TaskDraft): Task
  createGoal(draft: Partial<Goal>): Goal
  remove(kind: EntityKind, id: string): void
  resetToSource(): void
  undo(): void
  canUndo: boolean
  lastTouched: string | null
  taskDraft: { priority?: Task['priority'] } | null
  openTaskDraft(options?: { priority?: Task['priority'] }): void
  closeTaskDraft(): void
}
const Ctx = createContext<StoreValue | null>(null)
function browserAdapter() {
  // Storage unavailability should still allow an in-memory mock session.
  let storage: Storage | undefined
  try {
    storage = window.localStorage
    storage.getItem(SUBTEAM_KEY)
  } catch {
    /* private mode */
  }
  return createMockAdapter({ storage })
}
export function StoreProvider({
  children,
  adapter,
}: {
  children: ReactNode
  adapter?: DataAdapter
}) {
  const adapterRef = useRef<DataAdapter | null>(null)
  if (!adapterRef.current) adapterRef.current = adapter ?? browserAdapter()
  const source = adapterRef.current
  const [all, setAll] = useState(() => source.read())
  const [subteam, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem(SUBTEAM_KEY)
      return saved && all.subteams.some((s) => s.name === saved) ? saved : ALL_TEAMS
    } catch {
      return ALL_TEAMS
    }
  })
  const [partDesignId, setPart] = useState('')
  const [taskDraft, setTaskDraft] = useState<StoreValue['taskDraft']>(null)
  const [lastTouched, setLastTouched] = useState<string | null>(null)
  const history = useRef<Dataset[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const ds = useMemo(() => scopeTo(all, subteam, partDesignId), [all, subteam, partDesignId])
  function mutate<T>(operation: () => T, id?: string): T {
    const before = source.read()
    const result = operation()
    history.current = [...history.current.slice(-24), before]
    setCanUndo(true)
    setAll(source.read())
    setLastTouched(id ?? null)
    return result
  }
  function setSubteam(name: string) {
    setTeam(name)
    setPart('')
    try {
      localStorage.setItem(SUBTEAM_KEY, name)
    } catch {
      /* preference only */
    }
  }
  const value: StoreValue = {
    all,
    ds,
    subteam,
    partDesignId,
    subteams: all.subteams,
    isAllTeams: subteam === ALL_TEAMS,
    setSubteam,
    setPartDesignId: (id) =>
      setPart(all.partDesigns.some((p) => p.id === id && p.subteam === subteam) ? id : ''),
    clearScope: () => setSubteam(ALL_TEAMS),
    updateTask: (id, patch) => mutate(() => source.updateTask(id, patch), id),
    updatePartDesign: (id, patch) => mutate(() => source.updatePartDesign(id, patch)),
    updateGoal: (id, patch) => mutate(() => source.updateGoal(id, patch), id),
    createTask: (draft) => mutate(() => source.createTask(draft)),
    createGoal: (draft) => mutate(() => source.createGoal({ subteam, ...draft })),
    remove: (kind, id) => mutate(() => source.remove(kind, id)),
    resetToSource: () => mutate(() => source.reset()),
    undo: () => {
      const previous = history.current.at(-1)
      if (!previous) return
      source.replace(previous)
      history.current.pop()
      setAll(source.read())
      setCanUndo(history.current.length > 0)
    },
    canUndo,
    lastTouched,
    taskDraft,
    openTaskDraft: (options = {}) => setTaskDraft(options),
    closeTaskDraft: () => setTaskDraft(null),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useStore(): StoreValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}
