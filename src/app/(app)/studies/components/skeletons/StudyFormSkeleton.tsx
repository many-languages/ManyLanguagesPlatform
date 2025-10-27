export default function StudyFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="skeleton h-6 w-1/3" /> {/* form title */}
      <div className="flex flex-col gap-2">
        <label className="label">Title</label>
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="label">Description</label>
        <div className="skeleton h-24 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="label">Start Date</label>
          <div className="skeleton h-10 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label">End Date</label>
          <div className="skeleton h-10 w-full rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="label">Sample Size</label>
          <div className="skeleton h-10 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label">Payment</label>
          <div className="skeleton h-10 w-full rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="label">Ethical Permission</label>
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="label">Length</label>
        <div className="skeleton h-10 w-full rounded-md" />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <div className="skeleton h-10 w-24 rounded-md" /> {/* Cancel */}
        <div className="skeleton h-10 w-32 rounded-md" /> {/* Submit */}
      </div>
    </div>
  )
}
