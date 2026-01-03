"use client";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function TermsPage() {
  return (
    <div className="bg-[#05080A] min-h-screen flex flex-col text-white selection:bg-[#6e3ff3]/30 selection:text-[#6e3ff3]">
      <Header />
      <main className="grow py-24 px-6 sm:px-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <header>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-white/60">Last updated: January 2026</p>
          </header>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              1. Introduction
            </h2>
            <p className="text-white/70 leading-relaxed">
              Welcome to Simly. By accessing or using our website and services,
              you agree to be bound by these Terms and Conditions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              2. Usage Policy
            </h2>
            <p className="text-white/70 leading-relaxed">
              You agree to use Simly only for lawful purposes. You are
              responsible for all SMS messages sent through our gateway via your
              devices. Simly is not responsible for any blocked SIM cards or
              carrier charges incurred.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white/90">
              3. Disclaimer
            </h2>
            <p className="text-white/70 leading-relaxed">
              The service is provided "as is" without warranties of any kind. We
              do not guarantee immediate delivery of SMS messages as it depends
              on your device connectivity and carrier network.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
