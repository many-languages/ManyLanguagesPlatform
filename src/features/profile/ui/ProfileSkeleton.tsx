import Card from "@/src/components/ui/Card"

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
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-4/6" />
          <div className="skeleton h-4 w-3/6" />
        </div>
      </Card>
    </>
  )
}
