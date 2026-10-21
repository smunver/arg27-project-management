import { migrateDataset } from '../src/lib/migrate'
import type { Dataset } from '../src/lib/types'

export function fixture(): Dataset {
  const ds = migrateDataset({
    meta: {
      source: 'Test fixture',
      seasonStart: '2026-07-01',
      seasonEnd: '2027-07-01',
      competition: '2027-06-16',
    },
    subteams: [
      { code: 'SU', name: 'Suspension' },
      { code: 'CH', name: 'Chassis' },
    ],
    assemblies: [
      { subteam: 'Suspension', code: 'A01', name: 'Links' },
      { subteam: 'Suspension', code: 'A02', name: 'Uprights' },
      { subteam: 'Chassis', code: 'A01', name: 'Frame' },
    ],
    tasks: [
      {
        id: 'SU_A01_T001',
        subteam: 'Suspension',
        assembly: 'Links',
        assemblyCode: 'A01',
        title: 'Design links',
        status: 'In Progress',
        owners: ['Original Owner'],
        due: '2027-04-20',
        start: '2027-04-01',
        priority: 'High',
        dependsOn: [],
        deliverable: '',
        notes: '',
      },
      {
        id: 'SU_A02_T009',
        subteam: 'Suspension',
        assembly: 'Uprights',
        assemblyCode: 'A02',
        title: 'Machine uprights',
        status: 'Complete',
        owners: ['Machinist'],
        due: '',
        start: '',
        priority: '',
        dependsOn: ['SU_A01_T001'],
        deliverable: '',
        notes: '',
      },
      {
        id: 'CH_A01_T005',
        subteam: 'Chassis',
        assembly: 'Frame',
        assemblyCode: 'A01',
        title: 'Weld frame',
        status: 'Planned',
        owners: ['Welder'],
        due: '2027-04-22',
        start: '',
        priority: '',
        dependsOn: [],
        deliverable: '',
        notes: '',
      },
    ],
    goals: [
      {
        id: 'SU_G001',
        subteam: 'Suspension',
        title: 'Reduce mass',
        status: 'On Track',
        successMetric: '10% less',
        notes: '',
      },
    ],
  })
  ds.partDesigns[0].defaultDesigner = 'Ada Designer'
  return ds
}
