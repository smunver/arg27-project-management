import { useRef, useState } from 'react'
import { ALL_TEAMS, designsFor, selectDraftDesign, type TaskDraft } from '../lib/domain'
import { useStore } from '../lib/store'
import { PRIORITIES, STATUSES, type Task } from '../lib/types'
import { Button, Modal, Select, TextArea, TextInput } from './ui'

/** Mounted only while open: closing discards every field without a mutation. */
export function TaskDraftModal({ onSaved }: { onSaved: (task: Task) => void }) {
  const { all, subteam, partDesignId, taskDraft, closeTaskDraft, createTask, setSubteam } =
    useStore()
  const [draft, setDraft] = useState<TaskDraft>(() => {
    const initial: TaskDraft = {
      subteam: subteam === ALL_TEAMS ? '' : subteam,
      partDesignId: '',
      title: '',
      status: 'Not Started',
      priority: taskDraft?.priority ?? '',
    }
    return selectDraftDesign(all, initial, partDesignId)
  })
  const [ownerText, setOwnerText] = useState((draft.owners ?? []).join(', '))
  const [error, setError] = useState('')
  const saving = useRef(false)
  const designs = designsFor(all, draft.subteam)
  const design = designs.find((p) => p.id === draft.partDesignId)
  const patch = (changes: Partial<TaskDraft>) =>
    setDraft((previous) => ({ ...previous, ...changes }))
  return (
    <Modal open onClose={closeTaskDraft} labelledBy="task-draft-title" width="max-w-xl">
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (saving.current) return
          saving.current = true
          try {
            const saved = createTask({
              ...draft,
              owners: ownerText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
            setSubteam(saved.subteam)
            closeTaskDraft()
            onSaved(saved)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Task could not be saved.')
            saving.current = false
          }
        }}
      >
        <h2 id="task-draft-title" className="text-lg font-semibold">
          New task
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Subteam
            <Select
              aria-label="Subteam"
              required
              value={draft.subteam}
              placeholder="Choose a subteam"
              options={all.subteams.map((s) => ({ value: s.name, label: `${s.code} · ${s.name}` }))}
              onChange={(e) => {
                setDraft({ ...draft, subteam: e.target.value, partDesignId: '', owners: [] })
                setOwnerText('')
              }}
            />
          </label>
          <label className="space-y-1 text-sm">
            Part Design
            <Select
              aria-label="Part Design"
              required
              disabled={!draft.subteam}
              value={draft.partDesignId}
              placeholder="Choose a part design"
              options={designs.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
              onChange={(e) => {
                const next = selectDraftDesign(all, draft, e.target.value)
                setDraft(next)
                setOwnerText((next.owners ?? []).join(', '))
              }}
            />
          </label>
        </div>
        <p className="text-xs text-ink-2">
          Default designer: <strong>{design?.defaultDesigner || 'Unassigned'}</strong>
        </p>
        <label className="block space-y-1 text-sm">
          Owner
          <TextInput
            aria-label="Owner"
            value={ownerText}
            placeholder="Unassigned"
            onChange={(e) => setOwnerText(e.target.value)}
          />
          <span className="text-xs text-muted">
            Override for a handoff; separate multiple owners with commas.
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          Task title
          <TextInput
            autoFocus
            required
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <details className="space-y-3 text-sm">
          <summary className="cursor-pointer text-ink-2">Advanced fields</summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Status
              <Select
                value={draft.status}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(e) => patch({ status: e.target.value as Task['status'] })}
              />
            </label>
            <label>
              Priority
              <Select
                value={draft.priority}
                placeholder="No priority"
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                onChange={(e) => patch({ priority: e.target.value as Task['priority'] })}
              />
            </label>
            <label>
              Start
              <TextInput
                type="date"
                value={draft.start ?? ''}
                onChange={(e) => patch({ start: e.target.value })}
              />
            </label>
            <label>
              Due
              <TextInput
                type="date"
                value={draft.due ?? ''}
                onChange={(e) => patch({ due: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            Dependencies
            <select
              multiple
              className="mt-1 w-full rounded border border-hairline bg-surface-2 p-2"
              value={draft.dependsOn ?? []}
              onChange={(e) =>
                patch({ dependsOn: Array.from(e.target.selectedOptions, (o) => o.value) })
              }
            >
              {all.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} · {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Deliverable
            <TextArea
              value={draft.deliverable ?? ''}
              onChange={(e) => patch({ deliverable: e.target.value })}
            />
          </label>
          <label className="block">
            Notes
            <TextArea
              value={draft.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>
        </details>
        {error && (
          <p role="alert" className="text-sm text-st-blocked">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" onClick={closeTaskDraft}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save task
          </Button>
        </div>
      </form>
    </Modal>
  )
}
