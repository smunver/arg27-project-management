import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { StoreProvider, useStore } from '../src/lib/store'
import { createMockAdapter, STORAGE_KEY } from '../src/lib/adapter'
import { ScopeFilters } from '../src/components/ScopeFilters'
import { TaskDraftModal } from '../src/components/TaskDraftModal'
import { Tasks } from '../src/views/Tasks'
import { Timeline } from '../src/views/Timeline'
import { fixture } from './fixtures'

function DraftHarness({ onSaved }: { onSaved: () => void }) {
  const { taskDraft, openTaskDraft } = useStore()
  return (
    <>
      <ScopeFilters />
      <button onClick={() => openTaskDraft()}>New task</button>
      {taskDraft && <TaskDraftModal onSaved={onSaved} />}
    </>
  )
}

describe('task draft workflow', () => {
  it('writes nothing on open, selection, typing, Cancel or Escape', async () => {
    const user = userEvent.setup()
    const adapter = createMockAdapter({ initial: fixture() })
    const before = adapter.read()
    const saved = vi.fn()
    render(
      <StoreProvider adapter={adapter}>
        <DraftHarness onSaved={saved} />
      </StoreProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'New task' }))
    let modal = within(screen.getByRole('dialog'))
    expect((modal.getByLabelText('Part Design') as HTMLSelectElement).disabled).toBe(true)
    await user.selectOptions(modal.getByLabelText('Subteam'), 'Suspension')
    await user.selectOptions(modal.getByLabelText('Part Design'), 'SU_A01')
    expect((modal.getByLabelText('Owner') as HTMLInputElement).value).toBe('Ada Designer')
    await user.type(modal.getByLabelText('Task title'), 'Discard me')
    expect(adapter.read()).toEqual(before)
    await user.click(modal.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(adapter.read()).toEqual(before)
    expect(saved).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'New task' }))
    modal = within(screen.getByRole('dialog'))
    expect((modal.getByLabelText('Task title') as HTMLInputElement).value).toBe('')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(adapter.read()).toEqual(before)
  })
  it('creates exactly once on confirmation from all teams and preserves an owner override', async () => {
    const user = userEvent.setup()
    const adapter = createMockAdapter({ initial: fixture() })
    const saved = vi.fn()
    render(
      <StoreProvider adapter={adapter}>
        <DraftHarness onSaved={saved} />
      </StoreProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const modal = within(screen.getByRole('dialog'))
    await user.selectOptions(modal.getByLabelText('Subteam'), 'Suspension')
    await user.selectOptions(modal.getByLabelText('Part Design'), 'SU_A01')
    await user.clear(modal.getByLabelText('Owner'))
    await user.type(modal.getByLabelText('Owner'), 'Cross Team Owner')
    await user.type(modal.getByLabelText('Task title'), 'Confirmed task')
    await user.click(modal.getByRole('button', { name: 'Save task' }))
    expect(adapter.read().tasks).toHaveLength(4)
    expect(adapter.read().tasks.at(-1)).toMatchObject({
      id: 'SU_A01_T002',
      title: 'Confirmed task',
      owners: ['Cross Team Owner'],
      status: 'Not Started',
    })
    expect(adapter.read().partDesigns[0].defaultDesigner).toBe('Ada Designer')
    expect(saved).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('preselects the shared scope and clears design and owner when the draft subteam changes', async () => {
    const user = userEvent.setup()
    render(
      <StoreProvider adapter={createMockAdapter({ initial: fixture() })}>
        <DraftHarness onSaved={vi.fn()} />
      </StoreProvider>,
    )
    await user.selectOptions(screen.getByLabelText('Subteam'), 'Suspension')
    await user.selectOptions(screen.getByLabelText('Part Design'), 'SU_A01')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const modal = within(screen.getByRole('dialog'))
    expect((modal.getByLabelText('Part Design') as HTMLSelectElement).value).toBe('SU_A01')
    expect((modal.getByLabelText('Owner') as HTMLInputElement).value).toBe('Ada Designer')
    await user.selectOptions(modal.getByLabelText('Subteam'), 'Chassis')
    expect((modal.getByLabelText('Part Design') as HTMLSelectElement).value).toBe('')
    expect((modal.getByLabelText('Owner') as HTMLInputElement).value).toBe('')
    expect(modal.queryByRole('option', { name: /Links/ })).toBeNull()
  })
})

describe('existing views', () => {
  it('shares the cascade between list, board and timeline, including undated work', async () => {
    const user = userEvent.setup()
    const adapter = createMockAdapter({ initial: fixture() })
    const open = vi.fn()
    render(
      <StoreProvider adapter={adapter}>
        <ScopeFilters />
        <Tasks onOpenItem={open} />
        <Timeline onOpenItem={open} />
      </StoreProvider>,
    )
    await user.selectOptions(screen.getByLabelText('Subteam'), 'Suspension')
    await user.selectOptions(screen.getByLabelText('Part Design'), 'SU_A02')
    const table = screen.getByRole('table')
    expect(within(table).getByText('Machine uprights')).toBeTruthy()
    expect(within(table).queryByText('Design links')).toBeNull()
    expect(within(table).queryByText('Weld frame')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Undated tasks (1)' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Board' }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Machine uprights', { selector: 'p' })).toBeTruthy()
    expect(screen.queryByText('Weld frame')).toBeNull()
    await user.selectOptions(screen.getByLabelText('Subteam'), 'Chassis')
    expect((screen.getByLabelText('Part Design') as HTMLSelectElement).value).toBe('')
    expect(screen.getByText('Weld frame', { selector: 'p' })).toBeTruthy()
    expect(screen.queryByText('Machine uprights', { selector: 'p' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Machine uprights', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('Design links', { selector: 'p' })).toBeTruthy()
  })
  it('board changes task status without changing IDs', async () => {
    const user = userEvent.setup()
    const adapter = createMockAdapter({ initial: fixture() })
    render(
      <StoreProvider adapter={adapter}>
        <Tasks onOpenItem={vi.fn()} />
      </StoreProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Board' }))
    const card = screen.getByText('Design links', { selector: 'p' }).closest('article')!
    const column = screen.getByText('Blocked', { selector: 'span' }).closest('div.flex-col')!
    fireEvent.dragStart(card)
    fireEvent.dragOver(column)
    fireEvent.drop(column)
    expect(adapter.read().tasks[0]).toMatchObject({ id: 'SU_A01_T001', status: 'Blocked' })
    expect(adapter.read().tasks.map((t) => t.id)).toEqual(fixture().tasks.map((t) => t.id))
  })
  it('opens a stable task deep link even when another subteam is selected', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()))
    localStorage.setItem('arg27-tracker:subteam', 'Chassis')
    window.location.hash = '#/tasks/SU_A01_T001'
    render(<App />)
    const drawer = within(screen.getByRole('dialog', { name: 'task SU_A01_T001' }))
    expect(drawer.getByRole('heading', { name: 'Design links' })).toBeTruthy()
    expect(drawer.getByText(/Locked to preserve task ID/)).toBeTruthy()
  })

  it('renders dashboard, statuses and independent goals without the removed feature', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()))
    render(<App />)
    expect(screen.getByText('Work by status')).toBeTruthy()
    expect(screen.getByText('Reduce mass')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Part Designs/ })).toBeTruthy()
    expect(screen.queryByText(/milestone/i)).toBeNull()
    expect(document.body.textContent).not.toContain('Planned')
  })
})
