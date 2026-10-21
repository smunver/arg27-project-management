import { useStore } from '../lib/store'
import { Card, EmptyState, InlineEdit, PageHeader } from '../components/ui'

export function PartDesigns() {
  const { ds, updatePartDesign } = useStore()
  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Work"
        title="Part Designs"
        description="Confirm default designers with subteam leads. Changes apply to new task drafts; existing task owners stay assigned."
      />
      <Card pad={false}>
        {!ds.partDesigns.length ? (
          <EmptyState title="No part designs" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Subteam</th>
                  <th className="p-3">Part Design</th>
                  <th className="p-3">Default designer</th>
                </tr>
              </thead>
              <tbody>
                {ds.partDesigns.map((p) => (
                  <tr key={p.id} className="border-t border-hairline">
                    <td className="p-3">{p.id}</td>
                    <td className="p-3">{p.subteam}</td>
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">
                      <InlineEdit
                        value={p.defaultDesigner}
                        placeholder="Unassigned"
                        onCommit={(defaultDesigner) => updatePartDesign(p.id, { defaultDesigner })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
