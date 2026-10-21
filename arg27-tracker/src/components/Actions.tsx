import { useState } from 'react'
import { useStore } from '../lib/store'
import { exportJson, exportTasksCsv } from '../lib/export'
import { Button, cx, Modal } from './ui'
import { IconDownload, IconPlus, IconSearch, IconUndo } from './icons'
import type { DrawerTarget } from './ItemDrawer'

export function SearchButton({
  onOpenPalette,
  className,
}: {
  onOpenPalette: () => void
  className?: string
}) {
  return (
    <button
      onClick={onOpenPalette}
      className={cx(
        'flex h-8 w-full items-center gap-2 rounded-lg border border-hairline bg-surface px-3 text-left text-[13px] text-muted',
        className,
      )}
    >
      <IconSearch className="size-3.5" />
      <span className="flex-1">Search…</span>
      <kbd className="text-[10px]">Ctrl K</kbd>
    </button>
  )
}
export function Actions({ onOpenItem }: { onOpenItem: (t: DrawerTarget) => void }) {
  const { ds, isAllTeams, undo, canUndo, resetToSource, createGoal, openTaskDraft } = useStore()
  const [exporting, setExporting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <div className="space-y-2">
      <Button variant="primary" className="w-full" onClick={() => openTaskDraft()}>
        <IconPlus className="size-3.5" />
        New task
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        <Button onClick={undo} disabled={!canUndo}>
          <IconUndo className="size-3.5" />
          Undo
        </Button>
        <Button onClick={() => setExporting(true)}>
          <IconDownload className="size-3.5" />
          Export
        </Button>
      </div>
      <Button
        className="w-full"
        disabled={isAllTeams}
        onClick={() => onOpenItem({ kind: 'goal', id: createGoal({}).id })}
      >
        New goal
      </Button>
      <Button className="w-full" variant="subtle" onClick={() => setConfirmReset(true)}>
        Reset mock data
      </Button>
      <Modal open={exporting} onClose={() => setExporting(false)} labelledBy="export-title">
        <div className="space-y-4 p-5">
          <h2 id="export-title">Export current selection</h2>
          <div className="flex gap-2">
            <Button onClick={() => exportTasksCsv(ds)}>Tasks → CSV</Button>
            <Button onClick={() => exportJson(ds)}>Everything → JSON</Button>
            <Button onClick={() => setExporting(false)}>Close</Button>
          </div>
        </div>
      </Modal>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} labelledBy="reset-title">
        <div className="space-y-4 p-5">
          <h2 id="reset-title">Reset mock data?</h2>
          <p className="text-sm text-ink-2">
            Export all subteams first to keep a backup. This replaces local edits with the imported
            fixture; Undo can restore them.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetToSource()
                setConfirmReset(false)
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
