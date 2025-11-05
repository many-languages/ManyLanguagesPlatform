export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-2">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-7 w-32 bg-gray-300 rounded mx-auto"></div>
          <div className="space-y-3">
            <div className="h-10 w-full bg-gray-300 rounded"></div>
            <div className="h-10 w-full bg-gray-300 rounded"></div>
            <div className="h-10 w-32 bg-gray-300 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    </main>
  )
}
