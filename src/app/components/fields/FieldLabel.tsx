"use client"

import { InformationCircleIcon } from "@heroicons/react/24/outline"

export type FieldLabelProps = {
  htmlFor: string
  label: string
  hint?: string
}

/** Optional hint id suffix for aria-describedby on inputs */
export const fieldHintId = (fieldId: string) => `${fieldId}-hint`

export const fieldErrorId = (fieldId: string) => `${fieldId}-error`

export function fieldAriaDescribedBy(fieldId: string, opts: { hint?: boolean; error?: boolean }) {
  const parts: string[] = []
  if (opts.hint) parts.push(fieldHintId(fieldId))
  if (opts.error) parts.push(fieldErrorId(fieldId))
  return parts.length ? parts.join(" ") : undefined
}

export function FieldLabel({ htmlFor, label, hint }: FieldLabelProps) {
  const hintId = fieldHintId(htmlFor)

  return (
    <div className="label text-base font-medium flex items-center gap-1.5 flex-wrap">
      <label htmlFor={htmlFor}>{label}</label>
      {hint ? (
        <>
          <span id={hintId} className="sr-only">
            {hint}
          </span>
          <span
            className="tooltip tooltip-top inline-flex cursor-help shrink-0 select-none"
            data-tip={hint}
            aria-hidden
          >
            <InformationCircleIcon className="h-5 w-5 text-base-content/60" aria-hidden />
          </span>
        </>
      ) : null}
    </div>
  )
}
