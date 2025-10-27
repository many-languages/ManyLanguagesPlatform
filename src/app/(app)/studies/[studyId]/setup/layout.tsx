import StepIndicator from "./components/StepIndicator"

export default function StudySetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Step indicator */}
      <StepIndicator />
      <div className="card bg-base-200 p-6 shadow-md">{children}</div>
    </div>
  )
}
