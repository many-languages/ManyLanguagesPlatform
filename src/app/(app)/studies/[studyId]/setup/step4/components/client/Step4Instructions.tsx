"use client"

import Card from "@/src/app/components/Card"

export default function Step4Instructions() {
  return (
    <Card title="How to validate your study?" collapsible bgColor="bg-base-100" className="mb-6">
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>Review the variables extracted from your pilot run below</li>
        <li>
          Check the &quot;Diagnostics&quot; tab for any potential issues with your data structure
        </li>
        <li>
          Use the &quot;Run Inspector&quot; tab to drill down into specific participant sessions if
          needed
        </li>
        <li>
          If everything looks correct, click &quot;Approve Extraction&quot; at the bottom to proceed
          to analysis setup
        </li>
      </ol>
    </Card>
  )
}
