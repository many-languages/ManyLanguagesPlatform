import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import CodebookPersonalDataField from "./CodebookPersonalDataField"

export interface CodebookGroupCardGroup {
  groupKey: string
  description: string
  personalData: boolean
  childVariablesOpen: boolean
}

export interface CodebookGroupCardChildVariable {
  id: number
  variableName: string
}

interface CodebookGroupCardProps {
  group: CodebookGroupCardGroup
  childVariables: CodebookGroupCardChildVariable[]
  onUpdateGroup: (
    field: keyof Omit<CodebookGroupCardGroup, "groupKey" | "childVariablesOpen">,
    value: string | boolean
  ) => void
  onChildVariablesOpenChange: (open: boolean) => void
  onRemoveGroup: () => void
}

export default function CodebookGroupCard({
  group,
  childVariables,
  onUpdateGroup,
  onChildVariablesOpenChange,
  onRemoveGroup,
}: CodebookGroupCardProps) {
  const childCount = childVariables.length

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 flex-wrap">
          {group.groupKey}
          <span className="badge badge-neutral badge-sm font-normal">
            {childCount} variable{childCount !== 1 ? "s" : ""}
          </span>
        </span>
      }
      actions={
        <>
          <CodebookPersonalDataField
            size="sm"
            checked={group.personalData}
            onChange={(checked) => onUpdateGroup("personalData", checked)}
          />
          <button className="btn btn-xs btn-ghost text-error" onClick={onRemoveGroup}>
            Ungroup
          </button>
        </>
      }
      actionsPlacement="header"
      actionsWrapperClassName="flex items-center gap-3"
      borderColorClass="border-primary/20"
      bgColor="bg-base-200"
      className="mt-0"
    >
      <Textarea
        label="Group description *"
        className="w-full"
        rows={3}
        placeholder="Describe what these variables measure or represent..."
        value={group.description}
        onChange={(e) => onUpdateGroup("description", e.target.value)}
      />

      {childCount > 0 && (
        <Card
          title={
            <span className="text-base font-medium">Variables in this group ({childCount})</span>
          }
          collapsible
          open={group.childVariablesOpen}
          onOpenChange={onChildVariablesOpenChange}
          bgColor="bg-base-200"
          borderColorClass="border-base-300"
          className="mt-0 mb-0"
          bodyClassName="pt-0"
        >
          <div className="flex flex-wrap gap-1">
            {childVariables.map((v) => (
              <span key={v.id} className="badge badge-ghost badge-sm">
                {v.variableName}
              </span>
            ))}
          </div>
        </Card>
      )}
    </Card>
  )
}
