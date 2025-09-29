export default function PaginationControlsSkeleton() {
  return (
    <div className="join grid grid-cols-2 mt-4">
      <button className="join-item btn btn-secondary" disabled>
        Previous
      </button>
      <button className="join-item btn btn-secondary" disabled>
        Next
      </button>
    </div>
  )
}
