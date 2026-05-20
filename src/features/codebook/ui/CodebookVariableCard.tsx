import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import CodebookPersonalDataField from "./CodebookPersonalDataField"
import CodebookVariableHeader from "./CodebookVariableHeader"

export interface CodebookVariableCardVariable {
  id: number
  variableKey: string
  variableName: string
  type: string | null
  examples: Array<{ value: string; sourcePath: string }>
  description: string | null
  personalData: boolean
}

interface CodebookVariableCardProps {
  variable: CodebookVariableCardVariable
  onUpdateVariable: (
    field: keyof Omit<CodebookVariableCardVariable, "id">,
    value: string | boolean
  ) => void
}

export default function CodebookVariableCard({
  variable,
  onUpdateVariable,
}: CodebookVariableCardProps) {
  return (
    <Card
      title={variable.variableName}
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
