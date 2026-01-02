import type { Metadata } from "next";
import { APIKeysContent } from "@/components/api-keys/content"

export const metadata: Metadata = {
  title: "API Keys - Simly",
  description: "Generate and manage API keys for programmatic access to your SMS gateway. Create test and live keys for different environments.",
};

export default function APIKeysPage() {
  return <APIKeysContent />
}
