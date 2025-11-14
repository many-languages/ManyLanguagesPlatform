import Step2Content from "./components/client/Step2Content"
import SaveExitButton from "../components/client/SaveExitButton"

export default function Step2Page() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 2 – JATOS setup</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step2Content />
    </>
  )
}
