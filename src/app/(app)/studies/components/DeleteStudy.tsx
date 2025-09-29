"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import deleteStudy from "../mutations/deleteStudy"

interface DeleteStudyProps {
  studyId: number
  //   redirectTo?: string // optional, defaults to "/studies" not working with string type!
}

const DeleteStudy = ({ studyId }: DeleteStudyProps) => {
  const [deleteStudyMutation] = useMutation(deleteStudy)
  const router = useRouter()

  const handleDelete = async () => {
    if (window.confirm("This study will be permanently deleted. Are you sure?")) {
      try {
        await deleteStudyMutation({ id: studyId })

        router.push("/studies")

        toast.success("Study successfully deleted")
      } catch (error: any) {
        toast.error("Failed to delete study: " + error.message)
      }
    }
  }

  return (
    <button className="btn btn-error" onClick={handleDelete}>
      Delete Study
    </button>
  )
}

export default DeleteStudy
