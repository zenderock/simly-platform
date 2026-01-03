import AriqCapital from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simly - Android SMS Gateway",
  description:
    "Transform your Android phone into a professional SMS gateway. Send messages programmatically via API with real-time delivery tracking.",
};

export default function Home() {
  return <AriqCapital />;
}
