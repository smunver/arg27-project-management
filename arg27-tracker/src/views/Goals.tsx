import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Card, EmptyState, GoalStatusChip, PageHeader, SearchInput } from '../components/ui'
import { IconPlus } from '../components/icons'
import type { DrawerTarget } from '../components/ItemDrawer'

export function Goals({
  onOpenItem,
  focusId,
}: {
  onOpenItem: (target: DrawerTarget) => void
  focusId?: string
}) {
  const { ds, isAllTeams, createGoal } = useStore()
  const [q, setQ] = useState('')
  useEffect(() => {
    if (focusId && ds.goals.some((g) => g.id === focusId)) onOpenItem({ kind: 'goal', id: focusId })
  }, [focusId, ds.goals, onOpenItem])
  const goals = ds.goals.filter((g) =>
    [g.id, g.title, g.successMetric, g.notes]
      .join(' ')
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  )
  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Work"
        title="Goals"
        description="Independent subteam outcomes, with a declared status, success metric and notes."
        action={
          <Button
            variant="primary"
            disabled={isAllTeams}
            onClick={() => onOpenItem({ kind: 'goal', id: createGoal({}).id })}
          >
            <IconPlus className="size-3.5" />
            New goal
          </Button>
        }
      />
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Search goals…"
        className="mb-4 max-w-xs"
      />
      {!goals.length ? (
        <Card>
          <EmptyState title="No goals match" />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id}>
              <button
                className="w-full text-left"
                onClick={() => onOpenItem({ kind: 'goal', id: g.id })}
              >
                <div className="mb-2 flex justify-between gap-3">
                  <h2 className="font-semibold text-ink">{g.title}</h2>
                  <GoalStatusChip status={g.status} />
                </div>
                <p className="mb-3 text-xs text-muted">
                  {g.id} · {g.subteam}
                </p>
                <p className="text-sm text-ink-2">
                  {g.successMetric || 'No success metric defined'}
                </p>
                {g.notes && <p className="mt-3 text-sm text-muted">{g.notes}</p>}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
