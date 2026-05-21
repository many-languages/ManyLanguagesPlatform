import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import CodebookEntryStatus from "./CodebookEntryStatus"
import CodebookPersonalDataField from "./CodebookPersonalDataField"
import CodebookVariableHeader from "./CodebookVariableHeader"
import type { VariableCodebookEntry } from "../types"

export type CodebookVariableCardVariable = Pick<
  VariableCodebookEntry,
  "id" | "variableKey" | "variableName" | "type" | "examples" | "description" | "personalData"
>

interface CodebookVariableCardProps {
  variable: CodebookVariableCardVariable
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateVariable: (
    field: keyof Omit<CodebookVariableCardVariable, "id">,
    value: string | boolean
  ) => void
}

export default function CodebookVariableCard({
  variable,
  open,
  onOpenChange,
  onUpdateVariable,
}: CodebookVariableCardProps) {
  return (
    <Card
      collapsible
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <CodebookEntryStatus description={variable.description} />
          {variable.variableName}
        </span>
      }
      actions={
        <CodebookPersonalDataField
          checked={variable.personalData}
          onChange={(checked) => onUpdateVariable("personalData", checked)}
        />
      }
      actionsPlacement="header"
      bgColor="bg-base-200"
      borderColorClass="border-base-300"
      className="mt-0"
    >
      <CodebookVariableHeader variable={variable} showName={false} className="-mt-1" />

      <Textarea
        label="Description *"
        className="w-full"
        rows={3}
        placeholder="Describe what this variable measures or represents..."
        value={variable.description ?? ""}
        onChange={(e) => onUpdateVariable("description", e.target.value)}
      />
    </Card>
  )
}
