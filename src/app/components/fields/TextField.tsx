"use client"

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  error?: string
}

export const TextField = ({
  name,
  label,
  labelHint,
  error,
  className,
  type,
  ...props
}: TextFieldProps) => {
  const {
    register,
    formState: { isSubmitting, errors },
  } = useFormContext()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error
  const isPasswordField = type === "password"
  const inputType = isPasswordField && isPasswordVisible ? "text" : type

  return (
    <fieldset className="fieldset">
      <FieldLabel htmlFor={name} label={label} hint={labelHint} />
      <div className="relative">
        <input
          id={name}
          {...register(name)}
          {...props}
          type={inputType}
          disabled={isSubmitting || props.disabled}
          className={`input input-bordered ${fieldError ? "input-error" : ""} ${
            isPasswordField ? "pr-12" : ""
          } ${className || ""}`}
          aria-invalid={fieldError ? true : false}
          aria-describedby={fieldAriaDescribedBy(name, {
            hint: Boolean(labelHint),
            error: Boolean(fieldError),
          })}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 hover:text-base-content focus:outline-none"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            aria-pressed={isPasswordVisible}
            disabled={isSubmitting || props.disabled}
          >
            {isPasswordVisible ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {fieldError && (
        <span id={`${name}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

TextField.displayName = "TextField"

export default TextField
