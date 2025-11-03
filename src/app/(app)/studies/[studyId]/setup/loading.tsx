import SetupContentSkeleton from "./components/SetupContentSkeleton"

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="mb-8">
        {/* Step indicator skeleton */}
        <div className="steps mb-8 w-full">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="step">
              <div className="skeleton h-4 w-20"></div>
            </li>
          ))}
        </div>
      </div>
      <div className="card bg-base-200 p-6 shadow-md">
        <SetupContentSkeleton />
      </div>
    </div>
  )
}
