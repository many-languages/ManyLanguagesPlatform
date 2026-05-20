import Card from "@/src/components/ui/Card"

export default function CodebookInstructionsCard() {
  return (
    <Card title="How to create your codebook?" collapsible bgColor="bg-base-100" className="mb-6">
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>
          Describe each variable in your dataset. You cannot complete this step without descriptions
          for all variables.
        </li>
        <li>
          If multiple variables share a common path (e.g. all items in a rating matrix), use{" "}
          <strong>Create Group</strong> to annotate them together with one description.
        </li>
        <li>
          Mark any variables containing <strong>personal data</strong>. These will be excluded from
          the feedback template (Step 6) to protect participant privacy.
        </li>
        <li>
          You can <strong>save and continue later</strong> at any time.
        </li>
      </ol>
    </Card>
  )
}
