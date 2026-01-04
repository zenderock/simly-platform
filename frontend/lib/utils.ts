import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner";
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: any): string {
  if (error?.response?.data) {
    console.log("Error Response Data:", error.response.data);
  } else {
    console.log("Error Object:", error);
  }
  // Direct access to axios response data message
  if (error?.response?.data?.message) {
    // If message is just a string, return it
    if (typeof error.response.data.message === "string") {
       return error.response.data.message;
    }
  }

  let message = error.response?.data || error.message || "An unexpected error occurred";

  // Handle if message is a JSON-string
  if (typeof message === "string" && message.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.message) {
        return parsed.message;
      }
      message = parsed; // Treat as object below
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  // Handle object response
  if (typeof message === "object" && message !== null) {
    if (message.message) {
        return message.message;
    }
    // Deep fallback: stringify the object so at least we see something
    message = JSON.stringify(message);
  }

  // Trim whitespace
  if (typeof message === "string") {
    message = message.trim();
  }
  toast.error(message);
  return message;
}
