"use client"

import { usePathname, useRouter } from "next/navigation"

const steps = [
  { id: 1, name: "General info", path: "step1" },
  { id: 2, name: "JATOS setup", path: "step2" },
  { id: 3, name: "Feedback", path: "step3" },
]

export default function StudySetupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const currentStep = steps.findIndex((s) => pathname.endsWith(s.path)) + 1

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <ul className="steps mb-8 w-full">
        {steps.map((s) => (
          <li
            key={s.id}
            className={`step ${currentStep >= s.id ? "step-primary" : ""}`}
            onClick={() => router.push(s.path)}
          >
            {s.name}
          </li>
        ))}
      </ul>
      <div className="card bg-base-200 p-6">{children}</div>
    </div>
  )
}
