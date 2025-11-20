import SetupContentSkeleton from "./components/skeletons/SetupContentSkeleton"

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Step indicator is rendered in layout above, so we don't show it here */}
      <div className="card bg-base-200 p-6 shadow-md mt-4">
        <SetupContentSkeleton />
      </div>
    </div>
  )
}
