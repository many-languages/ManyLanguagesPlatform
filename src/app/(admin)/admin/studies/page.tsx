export const metadata = {
  title: "Admin Studies",
}

import AdminStudyManagementCard from "./components/AdminStudyManagementCard"
import { getStudiesRsc } from "./queries/getAdminStudies"

export default async function AdminStudiesPage() {
  const studies = await getStudiesRsc()

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Manage Studies</h1>
        <p className="text-base-content/70 max-w-3xl">
          Review and manage all studies in the system. You can stop, start, resume data collection,
          or delete studies.
        </p>
      </header>

      <AdminStudyManagementCard studies={studies} />
    </section>
  )
}
