"use client"

import * as React from "react"
import PhoneInput, { Country } from "react-phone-number-input"
import { cn } from "@/lib/utils"
// We import Input to use it as the underlying input component
import { Input } from "@/components/ui/input"

import "react-phone-number-input/style.css"

interface PhoneInputProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  defaultCountry?: Country 
  id?: string
  required?: boolean
}

export function PhoneInputComponent({ className, value, onValueChange, ...props }: PhoneInputProps) {
  return (
    <PhoneInput
      placeholder={props.placeholder}
      value={value}
      onChange={(val) => onValueChange(val as string)}
      defaultCountry="FR"
      className={cn("flex gap-2", className)} 
      inputComponent={Input}
      {...props}
    />
  )
}

export { PhoneInputComponent as PhoneInput }

