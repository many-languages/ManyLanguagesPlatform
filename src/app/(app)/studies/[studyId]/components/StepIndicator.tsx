"use client"

import { usePathname } from "next/navigation"

const steps = [
  { id: 1, name: "General info", path: "step1" },
  { id: 2, name: "JATOS setup", path: "step2" },
  { id: 3, name: "Test run", path: "step3" },
  { id: 4, name: "Feedback", path: "step4" },
]

export default function StepIndicator() {
  const pathname = usePathname()
  const currentStep = steps.findIndex((s) => pathname.endsWith(s.path)) + 1

  return (
    <ul className="steps mb-8 w-full">
      {steps.map((s) => (
        <li key={s.id} className={`step ${currentStep >= s.id ? "step-primary" : ""}`}>
          {s.name}
        </li>
      ))}
    </ul>
  )
}
