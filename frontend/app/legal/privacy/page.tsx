"use client";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function PrivacyPage() {
  return (
    <div className="bg-[#05080A] min-h-screen flex flex-col text-white selection:bg-[#6e3ff3]/30 selection:text-[#6e3ff3]">
      <Header />
      <main className="grow py-24 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <header>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-white/60">Last updated: January 2026</p>
          </header>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              1. Data Collection
            </h2>
            <p className="text-white/70 leading-relaxed">
              We collect minimal data necessary to provide our services,
              including your email address and device information required for
              the SMS gateway functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              2. SMS Data
            </h2>
            <p className="text-white/70 leading-relaxed">
              We do not read the content of your personal SMS messages. We only
              process messages explicitly sent via the API or designated for the
              2-way webhook functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              3. Security
            </h2>
            <p className="text-white/70 leading-relaxed">
              We implement industry-standard security measures to protect your
              data. Your API keys are encrypted.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
