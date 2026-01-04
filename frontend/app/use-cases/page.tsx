"use client";

import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShoppingBag,
  Stethoscope,
  Rocket,
  Cpu,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function UseCasesPage() {
  return (
    <div className="bg-[#05080A] font-sans min-h-screen flex flex-col text-white selection:bg-[#8c52ff]/30 selection:text-[#8c52ff] ">
      <Header />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative py-24 px-6 md:px-12 lg:px-24 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#8c52ff]/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-light tracking-tighter mb-8 text-white">
                Built for <span className="text-[#8c52ff]">real impact.</span>
              </h1>
              <p className="text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
                See how businesses and developers are using Simly to solve
                real-world communication challenges with a human touch.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Use Case 1: E-commerce & Logistics */}
        <UseCaseSection
          number="01"
          category="E-commerce & Logistics"
          title="Keep your customers in the loop."
          description="Automate order confirmations and delivery updates. Reduce anxiety by keeping your customers informed at every step of the journey, directly on their phone."
          quote="Since using Simly for delivery notifications, our support tickets dropped by 40%."
          author="David M., Operations Manager"
          icon={<ShoppingBag className="w-6 h-6 text-[#8c52ff]" />}
          features={[
            "Order Confirmation",
            "Shipping Updates",
            "Delivery Drivers Coordination",
            "Abandoned Cart Recovery",
          ]}
          align="left"
        />

        {/* Use Case 2: Healthcare */}
        <UseCaseSection
          number="02"
          category="Healthcare & Services"
          title="Reduce missed appointments."
          description="A simple SMS reminder can save thousands in lost revenue. Send automated appointment reminders to patients or clients and allow them to confirm or reschedule via text."
          quote="The 2-way SMS feature allows our patients to confirm appointments instantly. It's a game changer."
          author="Dr. Sarah L., Dental Clinic Owner"
          icon={<Stethoscope className="w-6 h-6 text-green-400" />}
          features={[
            "Appointment Reminders",
            "Test Results Notifications",
            "Prescription Readiness",
            "Staff Scheduling",
          ]}
          align="right"
        />

        {/* Use Case 3: Startups & SaaS */}
        <UseCaseSection
          number="03"
          category="Startups & SaaS"
          title="Secure and verify users instantly."
          description="Implement Two-Factor Authentication (2FA) and One-Time Passwords (OTP) without breaking the bank. Ensure your users are who they say they are with reliable SMS verification."
          quote="We switched from Twilio to Simly for our OTPs and saved 80% on our monthly bill."
          author="Alex R., CTO at TechFlow"
          icon={<Rocket className="w-6 h-6 text-indigo-400" />}
          features={[
            "User Verification (OTP)",
            "Two-Factor Authentication (2FA)",
            "System Alerts",
            "Onboarding Sequences",
          ]}
          align="left"
        />

        {/* Use Case 4: IoT & Automation */}
        <UseCaseSection
          number="04"
          category="IoT & Home Automation"
          title="Your devices, now connected."
          description="Receive alerts from your home security system, server monitoring tools, or smart devices even when the internet is down. Simly provides a reliable fallback channel."
          quote="My home server texts me if the temperature gets too high. It saved my rig twice already."
          author="Marcus T., Developer"
          icon={<Cpu className="w-6 h-6 text-orange-400" />}
          features={[
            "Server Down Alerts",
            "Security System Notifications",
            "Smart Home Triggers",
            "Offline Fallback",
          ]}
          align="right"
        />

        {/* Use Case 5: Marketing */}
        <UseCaseSection
          number="05"
          category="Marketing"
          title="Engage with a personal touch."
          description="Send personalized offers and gather feedback. Unlike email, SMS has a 98% open rate. Use it wisely to build stronger relationships with your audience."
          quote="Our flash sale notifications via Simly have a conversion rate 5x higher than email."
          author="Jessica K., Marketing Director"
          icon={<MessageCircle className="w-6 h-6 text-pink-400" />}
          features={[
            "Flash Sales Alerts",
            "Customer Feedback Surveys",
            "Event Invitations",
            "Loyalty Program Updates",
          ]}
          align="left"
        />

        {/* CTA Section */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto text-center bg-white/2 border border-white/10 rounded-3xl p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#8c52ff]/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white">
                Ready to tell your story?
              </h2>
              <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
                Join thousands of developers and businesses using Simly to
                connect with their audience.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:min-w-[200px] bg-[#8c52ff] hover:bg-[#5b32d1] text-white h-14 text-base rounded-none"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:min-w-[200px] border-white/10 hover:bg-white/5 text-white hover:text-[#8c52ff] bg-transparent h-14 text-base rounded-none"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

interface UseCaseSectionProps {
  number: string;
  category: string;
  title: string;
  description: string;
  quote: string;
  author: string;
  icon: React.ReactNode;
  features: string[];
  align: "left" | "right";
}

const UseCaseSection: React.FC<UseCaseSectionProps> = ({
  number,
  category,
  title,
  description,
  quote,
  author,
  icon,
  features,
  align,
}) => {
  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 border-b border-white/5">
      <div
        className={`max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center ${
          align === "right" ? "md:flex-row-reverse" : ""
        }`}
      >
        {/* Text Content */}
        <div className="flex-1 space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10">
              {icon}
            </div>
            <span className="text-[#8c52ff] font-mono text-sm tracking-widest uppercase">
              {category}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-light text-white leading-tight">
            {title}
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">{description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#8c52ff]"></div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Visual / Quote Content */}
        <div className="flex-1 w-full relative group">
          <div className="absolute inset-0 bg-linear-to-r from-[#8c52ff]/10 to-purple-500/10 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
          <div className="relative bg-[#0A0D11] border border-white/10 p-10 md:p-14 rounded-3xl overflow-hidden min-h-[320px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <QuoteIcon className="w-24 h-24 text-white" />
            </div>

            <blockquote className="relative z-10">
              <p className="text-xl md:text-2xl font-light text-white/90 italic leading-relaxed">
                "{quote}"
              </p>
              <footer className="mt-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                  {author.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-medium">{author}</div>
                  <div className="text-white/40 text-sm">
                    Valid Simly Customer
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};

const QuoteIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
  </svg>
);
