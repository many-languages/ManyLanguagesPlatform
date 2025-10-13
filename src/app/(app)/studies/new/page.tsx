"use client"

import { useMutation } from "@blitzjs/rpc"
import createStudy from "../mutations/createStudy"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

export default function NewStudy() {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)

  const handleCreate = async () => {
    try {
      const study = await createStudyMutation({
        title: "Untitled study",
        description: "",
        // minimal fields required by your schema
        startDate: new Date(),
        endDate: new Date(),
        sampleSize: 0,
        payment: "",
        ethicalPermission: "",
        length: "",
      })
      router.push(`/studies/${study.id}/setup/step1`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-2xl font-bold mb-6">Create new study</h1>
      <button className="btn btn-primary" onClick={handleCreate}>
        Start setup
      </button>
    </div>
  )
}
