import SimlyLandingPage from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simly - Android SMS Gateway",
  description:
    "Turn your Android phone into a professional SMS gateway. Send messages via API with real-time tracking.",
};

export default function Home() {
  return <SimlyLandingPage />;
}
