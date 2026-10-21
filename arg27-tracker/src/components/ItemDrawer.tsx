import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../lib/store'
import { GOAL_STATUSES, PRIORITIES, STATUSES, type Goal, type Task } from '../lib/types'
import { fmtRelativeTime } from '../lib/dates'
import { Button, EmptyState, InlineEdit, PartDesignChip, Select, TextArea, TextInput } from './ui'
import { IconClose } from './icons'
import { href } from '../lib/router'

export type DrawerTarget = { kind: 'task' | 'goal' | 'partDesign'; id: string } | null
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] items-start gap-3 py-2">
      <div className="pt-1 text-xs text-muted">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
function OwnersField({
  owners,
  onChange,
}: {
  owners: string[]
  onChange: (owners: string[]) => void
}) {
  const [draft, setDraft] = useState(owners.join(', '))
  useEffect(() => setDraft(owners.join(', ')), [owners])
  return (
    <TextInput
      aria-label="Task owners"
      value={draft}
      placeholder="Unassigned"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() =>
        onChange(
          draft
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
    />
  )
}
function TaskBody({ task }: { task: Task }) {
  const { all, updateTask } = useStore()
  const [error, setError] = useState('')
  const design = all.partDesigns.find((p) => p.id === task.partDesignId)
  const set = (patch: Partial<Task>) => {
    try {
      updateTask(task.id, patch)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update task.')
    }
  }
  const blockers = all.tasks.filter((t) => task.dependsOn.includes(t.id))
  const blocking = all.tasks.filter((t) => t.dependsOn.includes(task.id))
  return (
    <div>
      {error && (
        <p role="alert" className="text-sm text-st-blocked">
          {error}
        </p>
      )}
      <Row label="Title">
        <InlineEdit value={task.title} onCommit={(title) => set({ title })} />
      </Row>
      <Row label="Status">
        <Select
          aria-label="Task status"
          value={task.status}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          onChange={(e) => set({ status: e.target.value as Task['status'] })}
        />
      </Row>
      <Row label="Priority">
        <Select
          value={task.priority}
          placeholder="No priority"
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          onChange={(e) => set({ priority: e.target.value as Task['priority'] })}
        />
      </Row>
      <Row label="Owners">
        <OwnersField owners={task.owners} onChange={(owners) => set({ owners })} />
      </Row>
      <Row label="Subteam">
        <p className="text-sm">{task.subteam}</p>
      </Row>
      <Row label="Part Design">
        <PartDesignChip name={task.partDesign} code={task.designCode} />
        <p className="mt-1 text-xs text-muted">
          Locked to preserve task ID. Default designer: {design?.defaultDesigner || 'Unassigned'}.
        </p>
      </Row>
      <Row label="Dates">
        <div className="flex gap-2">
          <TextInput
            aria-label="Start date"
            type="date"
            value={task.start}
            onChange={(e) => set({ start: e.target.value })}
          />
          <TextInput
            aria-label="Due date"
            type="date"
            value={task.due}
            onChange={(e) => set({ due: e.target.value })}
          />
        </div>
      </Row>
      <Row label="Dependencies">
        <select
          aria-label="Task dependencies"
          multiple
          className="w-full rounded border border-hairline bg-surface-2 p-2 text-xs"
          value={task.dependsOn}
          onChange={(e) => set({ dependsOn: Array.from(e.target.selectedOptions, (o) => o.value) })}
        >
          {all.tasks
            .filter((t) => t.id !== task.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.title}
              </option>
            ))}
        </select>
      </Row>
      <Row label="Deliverable">
        <TextArea
          rows={2}
          value={task.deliverable}
          onChange={(e) => set({ deliverable: e.target.value })}
        />
      </Row>
      <Row label="Notes">
        <TextArea rows={3} value={task.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Row>
      {[
        ['Waiting on', blockers],
        ['Blocking', blocking],
      ].map(
        ([label, items]) =>
          (items as Task[]).length > 0 && (
            <Row key={label as string} label={label as string}>
              <ul>
                {(items as Task[]).map((t) => (
                  <li key={t.id}>
                    <a className="text-xs text-ink-2 hover:text-brand" href={href('tasks', t.id)}>
                      {t.id} · {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Row>
          ),
      )}
    </div>
  )
}
function GoalBody({ goal }: { goal: Goal }) {
  const { updateGoal } = useStore()
  const set = (patch: Partial<Goal>) => updateGoal(goal.id, patch)
  return (
    <div>
      <Row label="Goal">
        <TextInput value={goal.title} onChange={(e) => set({ title: e.target.value })} />
      </Row>
      <Row label="Status">
        <Select
          value={goal.status}
          placeholder="Unset"
          options={GOAL_STATUSES.map((s) => ({ value: s, label: s }))}
          onChange={(e) => set({ status: e.target.value as Goal['status'] })}
        />
      </Row>
      <Row label="Success metric">
        <TextArea
          value={goal.successMetric}
          onChange={(e) => set({ successMetric: e.target.value })}
        />
      </Row>
      <Row label="Notes">
        <TextArea value={goal.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Row>
    </div>
  )
}
export function ItemDrawer({ target, onClose }: { target: DrawerTarget; onClose: () => void }) {
  const { all, remove, updatePartDesign } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setConfirmDelete(false)
    setError('')
  }, [target?.id])
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])
  if (!target) return null
  const item =
    target.kind === 'task'
      ? all.tasks.find((t) => t.id === target.id)
      : target.kind === 'goal'
        ? all.goals.find((g) => g.id === target.id)
        : all.partDesigns.find((p) => p.id === target.id)
  const recent = all.log.filter((l) => l.entityId === target.id).slice(0, 6)
  const design =
    target.kind === 'partDesign' ? all.partDesigns.find((p) => p.id === target.id) : undefined
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${target.kind} ${target.id}`}
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-hairline bg-surface shadow-2xl"
      >
        <header className="flex justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <span className="text-xs text-muted">{target.id}</span>
            <h2 className="mt-2 text-lg font-semibold">
              {item ? ('title' in item ? item.title : item.name) : 'Item not found'}
            </h2>
          </div>
          <Button variant="subtle" onClick={onClose} aria-label="Close">
            <IconClose />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!item ? (
            <EmptyState title="This item no longer exists" />
          ) : target.kind === 'task' ? (
            <TaskBody key={item.id} task={item as Task} />
          ) : target.kind === 'goal' ? (
            <GoalBody goal={item as Goal} />
          ) : (
            design && (
              <Row label="Default designer">
                <InlineEdit
                  value={design.defaultDesigner}
                  placeholder="Unassigned"
                  onCommit={(defaultDesigner) => updatePartDesign(design.id, { defaultDesigner })}
                />
                <p className="mt-2 text-xs text-muted">Existing task owners are preserved.</p>
              </Row>
            )
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-st-blocked">
              {error}
            </p>
          )}
          {recent.length > 0 && (
            <div className="mt-6 border-t border-hairline pt-4">
              <h3 className="mb-2 text-xs text-muted">Recent changes</h3>
              <ul className="space-y-2">
                {recent.map((l) => (
                  <li key={l.id} className="text-xs text-ink-2">
                    {fmtRelativeTime(l.at)} · {l.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {item && target.kind !== 'partDesign' && (
          <footer className="flex items-center justify-between gap-2 border-t border-hairline px-5 py-3">
            <span className="text-xs text-muted">Edits save in this browser</span>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    try {
                      remove(target.kind as 'task' | 'goal', target.id)
                      onClose()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not delete.')
                    }
                  }}
                >
                  Confirm delete
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </footer>
        )}
      </div>
    </>,
    document.body,
  )
}
