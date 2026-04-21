import Card from "@/src/app/components/Card"

export default function ProfileSkeleton() {
  return (
    <>
      <div className="flex justify-center mb-2">
        <div className="skeleton h-9 w-48" />
      </div>
      <Card
        title={"Profile information"}
        actions={
          <>
            <div className="skeleton h-10 w-32" />
            <div className="skeleton h-10 w-36" />
          </>
        }
      >
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-full bg-gray-300 rounded" />
          <div className="h-4 w-5/6 bg-gray-300 rounded" />
          <div className="h-4 w-4/6 bg-gray-300 rounded" />
          <div className="h-4 w-3/6 bg-gray-300 rounded" />
        </div>
      </Card>
    </>
  )
}
