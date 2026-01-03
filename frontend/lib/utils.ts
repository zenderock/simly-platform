import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: any): string {
  let message = error.response?.data || error.message || "An unexpected error occurred";

  // Handle object response
  if (typeof message === "object") {
    message = message.message || JSON.stringify(message);
  }

  // Trim whitespace
  if (typeof message === "string") {
    message = message.trim();
  }

  return message;
}
