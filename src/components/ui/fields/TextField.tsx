"use client"

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { TextInput } from "./TextInput"

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
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

  const fieldError = (errors[name]?.message as string) || error
  const isPasswordField = type === "password"
  const inputType = isPasswordField && isPasswordVisible ? "text" : type

  return (
    <TextInput
      id={name}
      label={label}
      labelHint={labelHint}
      error={fieldError}
      {...register(name)}
      {...props}
      type={inputType}
      disabled={isSubmitting || props.disabled}
      className={className}
      endAdornment={
        isPasswordField ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-base-content/60 hover:text-base-content focus:outline-none"
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
        ) : null
      }
    />
  )
}

TextField.displayName = "TextField"

export default TextField
