
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Simly - Android SMS Gateway",
  description: "Transform your Android phone into a professional SMS gateway. Send messages programmatically via API with real-time delivery tracking.",
};

export default function Home() {
  redirect("/dashboard");
}
