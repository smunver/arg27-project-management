import { ALL_TEAMS, designsFor } from '../lib/domain'
import { useStore } from '../lib/store'
import { Button, Select } from './ui'

export function ScopeFilters() {
  const { all, subteam, setSubteam, partDesignId, setPartDesignId, clearScope } = useStore()
  const design = all.partDesigns.find((p) => p.id === partDesignId)
  return (
    <div className="mb-5 space-y-2 border-b border-hairline pb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs text-muted">
          Subteam
          <Select
            aria-label="Subteam"
            value={subteam}
            onChange={(e) => setSubteam(e.target.value)}
            options={[
              { value: ALL_TEAMS, label: 'All subteams' },
              ...all.subteams.map((s) => ({ value: s.name, label: `${s.code} · ${s.name}` })),
            ]}
          />
        </label>
        <label className="space-y-1 text-xs text-muted">
          Part Design
          <Select
            aria-label="Part Design"
            disabled={subteam === ALL_TEAMS}
            value={partDesignId}
            onChange={(e) => setPartDesignId(e.target.value)}
            placeholder="All part designs"
            options={designsFor(all, subteam).map((p) => ({
              value: p.id,
              label: `${p.code} · ${p.name}`,
            }))}
          />
        </label>
        <Button variant="subtle" size="sm" onClick={clearScope}>
          Clear filters
        </Button>
      </div>
      <p aria-label="Current scope" className="text-xs text-ink-2">
        All subteams{subteam !== ALL_TEAMS && ` → ${subteam}`}
        {design && ` → ${design.code} · ${design.name}`}
      </p>
    </div>
  )
}
