import { ShieldExclamationIcon } from "@heroicons/react/24/solid"
import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import CodebookEntryStatus from "./CodebookEntryStatus"
import CodebookPersonalDataField from "./CodebookPersonalDataField"
import CodebookVariableChip from "./CodebookVariableChip"
import type { CodebookGroupEntry, VariableCodebookEntry } from "../types"

export type CodebookGroupCardGroup = Pick<CodebookGroupEntry, "groupKey" | "description">

export type CodebookGroupCardChildVariable = Pick<
  VariableCodebookEntry,
  "id" | "variableName" | "type" | "personalData"
>

interface CodebookGroupCardProps {
  group: CodebookGroupCardGroup
  childVariables: CodebookGroupCardChildVariable[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateGroup: (field: keyof Omit<CodebookGroupCardGroup, "groupKey">, value: string) => void
  onSetPersonalData: (checked: boolean) => void
  onRemoveGroup: () => void
}

export default function CodebookGroupCard({
  group,
  childVariables,
  open,
  onOpenChange,
  onUpdateGroup,
  onSetPersonalData,
  onRemoveGroup,
}: CodebookGroupCardProps) {
  const childCount = childVariables.length
  const personalCount = childVariables.filter((v) => v.personalData).length
  const allPersonal = childCount > 0 && personalCount === childCount
  const mixed = personalCount > 0 && !allPersonal

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
          {personalCount > 0 && (
            <span className="badge badge-outline badge-sm gap-1 font-normal">
              <ShieldExclamationIcon className="h-3 w-3" aria-hidden="true" />
              {personalCount} of {childCount} personal
            </span>
          )}
        </span>
      }
      actions={
        <CodebookPersonalDataField
          checked={allPersonal}
          indeterminate={mixed}
          // From the mixed state, a click flags every variable (the safer direction).
          onChange={(checked) => onSetPersonalData(checked)}
          disabled={childCount === 0}
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
              <CodebookVariableChip
                key={v.id}
                variableName={v.variableName}
                type={v.type}
                personalData={v.personalData}
              />
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
