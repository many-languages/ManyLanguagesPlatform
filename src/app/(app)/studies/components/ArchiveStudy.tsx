"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import archiveStudy from "../mutations/archiveStudy"

interface ArchiveStudyProps {
  studyId: number
  //   redirectTo?: string // optional, defaults to "/studies" not working with string type!
}

const ArchiveStudy = ({ studyId }: ArchiveStudyProps) => {
  const [archiveStudyMutation] = useMutation(archiveStudy)
  const router = useRouter()

  const onArchive = async () => {
    if (window.confirm("This study will be archived (not deleted). Continue?")) {
      try {
        await archiveStudyMutation({ id: studyId })
        toast.success("Study archived")
        router.push("/studies")
      } catch (e: any) {
        toast.error(e.message || "Failed to archive study")
      }
    }
  }
  return (
    <button className="btn btn-error" onClick={onArchive}>
      Archive
    </button>
  )
}

export default ArchiveStudy
