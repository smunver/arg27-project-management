import { normalizeStatus } from './domain'
import type { ChangeEntry, Dataset, Goal, PartDesign, Task } from './types'

/** Compatibility boundary for the archived seed and v2 browser data only. */
interface LegacyTask extends Omit<Task, 'status' | 'partDesignId' | 'partDesign' | 'designCode'> {
  status: string
  assembly?: string
  assemblyCode?: string
  partDesignId?: string
  partDesign?: string
  designCode?: string
  milestoneId?: string
}
interface Input {
  meta: Dataset['meta']
  subteams: Dataset['subteams']
  assemblies?: { subteam: string; code: string; name: string }[]
  partDesigns?: PartDesign[]
  tasks: LegacyTask[]
  goals: Goal[]
  log?: (Omit<ChangeEntry, 'kind'> & { kind: string })[]
  taskCounters?: Record<string, number>
}
export function migrateDataset(input: unknown): Dataset {
  const raw = input as Input
  if (
    !raw ||
    !Array.isArray(raw.tasks) ||
    !Array.isArray(raw.goals) ||
    !Array.isArray(raw.subteams) ||
    !raw.meta
  )
    throw new Error('Invalid tracker data; original browser data has been retained.')
  const subteams = structuredClone(raw.subteams)
  // The old importer omitted teams with no populated work. The uploaded
  // workbook's References!A14:B14 confirms Unsprung = UN; preserve its 5 designs.
  if (
    (raw.assemblies ?? raw.partDesigns ?? []).some((p) => p.subteam === 'Unsprung') &&
    !subteams.some((s) => s.name === 'Unsprung')
  )
    subteams.push({ name: 'Unsprung', code: 'UN' })
  const partDesigns: PartDesign[] = raw.partDesigns
    ? structuredClone(raw.partDesigns)
    : (raw.assemblies ?? []).map((a) => {
        const subteamCode = subteams.find((s) => s.name === a.subteam)?.code
        if (!subteamCode) throw new Error(`Unknown subteam: ${a.subteam}`)
        // Owner strings cannot establish confirmed design responsibility. Never infer it.
        return {
          ...a,
          id: `${subteamCode}_${a.code}`,
          subteamCode,
          defaultDesigner: '',
          active: true,
        }
      })
  const tasks: Task[] = raw.tasks.map((t) => {
    const design = partDesigns.find(
      (p) =>
        p.subteam === t.subteam &&
        (t.partDesignId
          ? p.id === t.partDesignId
          : p.code === t.assemblyCode && p.name === t.assembly),
    )
    // Select fields explicitly: old relationship fields cannot leak to exports or storage.
    return {
      id: t.id,
      subteam: t.subteam,
      title: t.title,
      partDesignId: design?.id ?? t.partDesignId ?? '',
      partDesign: design?.name ?? t.partDesign ?? t.assembly ?? '',
      designCode: design?.code ?? t.designCode ?? t.assemblyCode ?? '',
      status: normalizeStatus(t.status),
      start: t.start,
      due: t.due,
      owners: [...t.owners],
      priority: t.priority,
      dependsOn: [...t.dependsOn],
      deliverable: t.deliverable,
      notes: t.notes,
      ...(t.duplicateOf ? { duplicateOf: t.duplicateOf } : {}),
    }
  })
  const taskCounters = { ...raw.taskCounters }
  for (const t of tasks) {
    const match = /^(.*)_T(\d+)(?:$|\D)/.exec(t.id)
    if (match) taskCounters[match[1]] = Math.max(taskCounters[match[1]] ?? 0, Number(match[2]))
  }
  return structuredClone({
    schemaVersion: 3,
    meta: {
      ...raw.meta,
      source: raw.meta.source.includes('.xlsx') ? 'ARG27 imported workbook' : raw.meta.source,
    },
    subteams,
    partDesigns,
    tasks,
    goals: raw.goals,
    taskCounters,
    groupBy: 'subteam',
    groups: subteams,
    log: (raw.log ?? []).filter((l) => l.kind === 'task' || l.kind === 'goal') as ChangeEntry[],
  })
}
