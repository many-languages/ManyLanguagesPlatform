import Step1Content from "./components/client/Step1Content"

export default async function Step1Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; returnTo?: string }>
}) {
  const params = await searchParams
  const isEditMode = params.edit === "true"
  const returnTo = params.returnTo || "step2"

  return (
    <>
      <h2 className="text-xl font-semibold mb-4 text-center">Step 1 – General information</h2>
      <Step1Content isEditMode={isEditMode} returnTo={returnTo} />
    </>
  )
}
