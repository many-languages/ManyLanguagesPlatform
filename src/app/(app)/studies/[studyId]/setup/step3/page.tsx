import Step3Content from "./components/client/Step3Content"
import SaveExitButton from "../components/client/SaveExitButton"

export default function Step3Page() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 3 – Test run</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step3Content />
    </>
  )
}
