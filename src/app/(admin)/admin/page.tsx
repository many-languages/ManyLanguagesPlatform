import StudySummaryCard, { ADMIN_STUDY_SUMMARY_LINKS } from "@/src/app/components/StudySummaryCard"
import { getAdminStudyCounts } from "./studies/queries/getAdminStudyCounts"

export const metadata = {
  title: "Admin Console",
  description: "High-level controls for ManyLanguagesPlatform administrators",
}

export default async function AdminHomePage() {
  const counts = await getAdminStudyCounts()

  return (
    <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <StudySummaryCard counts={counts} links={ADMIN_STUDY_SUMMARY_LINKS} />
    </section>
  )
}
