export default function StudySetupLayout({ children }: { children: React.ReactNode }) {
  // Layout now only provides the structural shell
  // Data fetching and StepIndicator moved to template.tsx to ensure freshness on navigation
  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Template will inject StepIndicator here */}
      <div className="card bg-base-200 p-6 shadow-md mt-4">{children}</div>
    </div>
  )
}
