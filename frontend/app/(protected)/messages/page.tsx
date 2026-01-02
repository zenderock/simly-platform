import type { Metadata } from "next";
import { MessagesContent } from "@/components/messages/content"

export const metadata: Metadata = {
  title: "Messages - Simly",
  description: "View and manage all your SMS messages, track delivery status, and analyze messaging history.",
};

export default function MessagesPage() {
  return <MessagesContent />
}
