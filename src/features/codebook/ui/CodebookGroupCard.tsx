import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import CodebookEntryStatus from "./CodebookEntryStatus"
import CodebookPersonalDataField from "./CodebookPersonalDataField"
import CodebookVariableChip from "./CodebookVariableChip"
import type { CodebookGroupEntry, VariableCodebookEntry } from "../types"

export type CodebookGroupCardGroup = Pick<
  CodebookGroupEntry,
  "groupKey" | "description" | "personalData"
>

export type CodebookGroupCardChildVariable = Pick<
  VariableCodebookEntry,
  "id" | "variableName" | "type"
>

interface CodebookGroupCardProps {
  group: CodebookGroupCardGroup
  childVariables: CodebookGroupCardChildVariable[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateGroup: (
    field: keyof Omit<CodebookGroupCardGroup, "groupKey">,
    value: string | boolean
  ) => void
  onRemoveGroup: () => void
}

export default function CodebookGroupCard({
  group,
  childVariables,
  open,
  onOpenChange,
  onUpdateGroup,
  onRemoveGroup,
}: CodebookGroupCardProps) {
  const childCount = childVariables.length

  return (
    <Card
      collapsible
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2 flex-wrap">
          <CodebookEntryStatus description={group.description} />
          {group.groupKey}
          {childCount > 0 && (
            <span className="badge badge-neutral badge-sm font-normal">
              {childCount} variable{childCount !== 1 ? "s" : ""}
            </span>
          )}
        </span>
      }
      actions={
        <CodebookPersonalDataField
          checked={group.personalData}
          onChange={(checked) => onUpdateGroup("personalData", checked)}
        />
      }
      actionsPlacement="header"
      actionsWrapperClassName="flex items-center"
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
        <div>
          <p className="text-xs text-base-content/50 mb-1">Variables in this group</p>
          <div className="flex flex-wrap gap-1">
            {childVariables.map((v) => (
              <CodebookVariableChip key={v.id} variableName={v.variableName} type={v.type} />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button type="button" className="btn btn-xs btn-ghost text-error" onClick={onRemoveGroup}>
          Ungroup
        </button>
      </div>
    </Card>
  )
}
