export default function Loading() {
  return (
    <div className="space-y-4 w-full">
      {/* Title skeleton */}
      <div className="skeleton h-9 w-32"></div>

      {/* Form skeleton */}
      <div className="fieldset bg-base-200 border-base-300 rounded-box w-md border p-4 space-y-4">
        {/* Email field skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-16"></div>
          <div className="skeleton h-10 w-full rounded-md"></div>
        </div>

        {/* Password field skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-20"></div>
          <div className="skeleton h-10 w-full rounded-md"></div>
        </div>

        {/* Forgot password link skeleton */}
        <div className="skeleton h-4 w-40 mt-2"></div>

        {/* Submit button skeleton */}
        <div className="skeleton h-10 w-full rounded-md mt-6"></div>
      </div>

      {/* Or Sign Up link skeleton */}
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-8"></div>
        <div className="skeleton h-4 w-16"></div>
      </div>
    </div>
  )
}
