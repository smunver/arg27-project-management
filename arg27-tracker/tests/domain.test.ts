import { describe, expect, it } from 'vitest'
import seed from '../fixtures/legacy-seed.json'
import canonicalSeed from '../src/data/seed.json'
import { createMockAdapter, LEGACY_STORAGE_KEY, STORAGE_KEY } from '../src/lib/adapter'
import { ALL_TEAMS, designsFor, filterTasks, scopeTo, selectDraftDesign } from '../src/lib/domain'
import { migrateDataset } from '../src/lib/migrate'
import { STATUSES } from '../src/lib/types'
import { fixture } from './fixtures'

const draft = { subteam: 'Suspension', partDesignId: 'SU_A01', title: 'New work' }

describe('legacy migration', () => {
  it('preserves every imported task ID, actual owners and dependency ID verbatim', () => {
    const ds = migrateDataset(seed)
    expect(ds.tasks).toHaveLength(221)
    expect(ds.partDesigns).toHaveLength(83)
    expect(ds.subteams).toHaveLength(14)
    expect(ds.subteams).toContainEqual({ name: 'Unsprung', code: 'UN' })
    expect(ds.partDesigns.filter((p) => p.subteam === 'Unsprung').map((p) => p.id)).toEqual([
      'UN_A01',
      'UN_A02',
      'UN_A03',
      'UN_A04',
      'UN_A05',
    ])
    expect(ds.goals).toHaveLength(17)
    expect(ds.tasks.map((t) => t.id)).toEqual(seed.tasks.map((t) => t.id))
    expect(ds.tasks.map((t) => t.owners)).toEqual(seed.tasks.map((t) => t.owners))
    expect(ds.tasks.map((t) => t.dependsOn)).toEqual(seed.tasks.map((t) => t.dependsOn))
    expect(
      ds.tasks.every((t) =>
        ds.partDesigns.some((p) => p.id === t.partDesignId && p.subteam === t.subteam),
      ),
    ).toBe(true)
    expect(ds.partDesigns.every((p) => p.defaultDesigner === '')).toBe(true)
    expect(ds).not.toHaveProperty('milestones')
    expect(ds).not.toHaveProperty('assemblies')
    expect(ds.tasks.every((t) => !('milestoneId' in t))).toBe(true)
    expect(new Set(ds.tasks.map((t) => t.status))).toEqual(new Set(STATUSES))
    expect(migrateDataset(ds)).toEqual(ds)
    expect(migrateDataset(canonicalSeed)).toEqual(ds)
  })
  it('migrates v2 edits, writes v3 and leaves the v2 recovery copy untouched', () => {
    const legacy = structuredClone(seed)
    legacy.tasks[0].title = 'My local edit'
    const backup = JSON.stringify(legacy)
    localStorage.setItem(LEGACY_STORAGE_KEY, backup)
    const adapter = createMockAdapter({ storage: localStorage })
    expect(adapter.read().tasks[0].title).toBe('My local edit')
    adapter.updateTask(legacy.tasks[0].id, { notes: 'Keep this' })
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(backup)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.tasks[0].id).toBe(legacy.tasks[0].id)
    expect(saved.tasks[0].notes).toBe('Keep this')
    expect(saved).not.toHaveProperty('milestones')
  })
})
describe('designer defaults and task identity', () => {
  it('prefills the selected designer and permits explicit owner or unassigned overrides', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    const selected = selectDraftDesign(adapter.read(), { ...draft, partDesignId: '' }, 'SU_A01')
    expect(selected.owners).toEqual(['Ada Designer'])
    expect(adapter.createTask(draft).owners).toEqual(['Ada Designer'])
    expect(adapter.createTask({ ...draft, owners: ['Cross Team Owner'] }).owners).toEqual([
      'Cross Team Owner',
    ])
    expect(adapter.createTask({ ...draft, owners: [] }).owners).toEqual([])
    expect(adapter.read().partDesigns[0].defaultDesigner).toBe('Ada Designer')
  })
  it('does not rewrite existing task owners when a default designer changes', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    const task = adapter.createTask(draft)
    adapter.updatePartDesign('SU_A01', { defaultDesigner: 'New Designer' })
    expect(adapter.read().tasks.find((t) => t.id === task.id)?.owners).toEqual(['Ada Designer'])
    expect(adapter.read().tasks[0].owners).toEqual(['Original Owner'])
    expect(adapter.createTask(draft).owners).toEqual(['New Designer'])
  })
  it('does not infer a designer from existing task owners', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    expect(adapter.createTask({ ...draft, partDesignId: 'SU_A02' }).owners).toEqual([])
  })
  it('allocates distinct IDs for saves from the same render and retains IDs on edits and reload', () => {
    const adapter = createMockAdapter({ initial: fixture(), storage: localStorage })
    const a = adapter.createTask(draft)
    const b = adapter.createTask(draft)
    expect([a.id, b.id]).toEqual(['SU_A01_T002', 'SU_A01_T003'])
    adapter.updateTask(a.id, {
      status: 'Completed',
      title: 'Revised title',
      owners: ['Other Owner'],
    })
    expect(adapter.read().tasks.map((t) => t.id)).toEqual([
      'SU_A01_T001',
      'SU_A02_T009',
      'CH_A01_T005',
      a.id,
      b.id,
    ])
    const reloaded = createMockAdapter({ storage: localStorage })
    expect(reloaded.read()).toEqual(adapter.read())
    expect(reloaded.createTask(draft).id).toBe('SU_A01_T004')
  })
  it('does not reuse IDs after deletion or undo', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    const before = adapter.read()
    const a = adapter.createTask(draft)
    adapter.remove('task', a.id)
    expect(adapter.createTask(draft).id).toBe('SU_A01_T003')
    adapter.replace(before)
    expect(adapter.createTask(draft).id).toBe('SU_A01_T004')
  })
  it('rejects moving or re-keying tasks and invalid creates without reserving IDs', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    expect(() => adapter.updateTask('SU_A01_T001', { partDesignId: 'SU_A02' })).toThrow(/locked/)
    expect(() => adapter.updateTask('SU_A01_T001', { id: 'changed' })).toThrow(/locked/)
    expect(() => adapter.createTask({ ...draft, subteam: 'Chassis' })).toThrow(/belonging/)
    expect(() => adapter.createTask({ ...draft, title: '  ' })).toThrow(/title/)
    expect(() => adapter.createTask({ ...draft, start: '2027-05-01', due: '2027-04-01' })).toThrow(
      /Start/,
    )
    expect(adapter.createTask(draft).id).toBe('SU_A01_T002')
  })
  it('blocks deletion of referenced tasks and rejects dependency cycles', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    expect(() => adapter.remove('task', 'SU_A01_T001')).toThrow(/inbound/)
    expect(() => adapter.updateTask('SU_A01_T001', { dependsOn: ['SU_A02_T009'] })).toThrow(/cycle/)
    expect(() => adapter.createTask({ ...draft, dependsOn: ['missing'] })).toThrow(/Unknown/)
  })
})
describe('hierarchical filtering', () => {
  it('scopes all teams, a team and a design without colliding A01 codes', () => {
    const ds = fixture()
    expect(scopeTo(ds, ALL_TEAMS).tasks).toHaveLength(3)
    expect(scopeTo(ds, 'Suspension').tasks.map((t) => t.id)).toEqual(['SU_A01_T001', 'SU_A02_T009'])
    expect(scopeTo(ds, 'Chassis', 'CH_A01').tasks.map((t) => t.id)).toEqual(['CH_A01_T005'])
    expect(designsFor(ds, 'Suspension').map((p) => p.id)).toEqual(['SU_A01', 'SU_A02'])
    expect(scopeTo(ds, 'Chassis', 'SU_A01').tasks.map((t) => t.id)).toEqual(['CH_A01_T005'])
  })
  it('returns all work for a design including owner overrides, and filters actual owners', () => {
    const adapter = createMockAdapter({ initial: fixture() })
    const newTask = adapter.createTask({ ...draft, owners: ['Override Owner'] })
    const scoped = scopeTo(adapter.read(), 'Suspension', 'SU_A01')
    expect(scoped.tasks.map((t) => t.id)).toEqual(['SU_A01_T001', newTask.id])
    expect(filterTasks(scoped.tasks, { owner: 'Override Owner' }).map((t) => t.id)).toEqual([
      newTask.id,
    ])
    expect(filterTasks(scoped.tasks, { owner: 'Ada Designer' })).toEqual([])
    expect(filterTasks(adapter.read().tasks, { status: 'Completed' }).map((t) => t.id)).toEqual([
      'SU_A02_T009',
    ])
    expect(
      filterTasks(scoped.tasks, { query: 'NEW WORK', status: 'Not Started' }).map((t) => t.id),
    ).toEqual([newTask.id])
  })
})
