"use client";

import Link from "next/link";
import { Check, Sprout, Gem, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

interface PricingCardProps {
  icon: React.ReactNode;
  category: string;
  title: string;
  description: string;
  price: string;
  period: string;
  initials: string;
  features: string[];
}

const PricingCard: React.FC<PricingCardProps> = ({
  icon,
  category,
  title,
  description,
  price,
  period,
  initials,
  features,
}) => {
  return (
    <div className="group relative flex h-full flex-col bg-[#05080A] border border-white/10 p-8 hover:border-[#8c52ff]/50 transition-all duration-300 rounded-lg">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#8c52ff]">
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase">
            {category}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="w-10 h-10 rounded bg-[#8c52ff] flex items-center justify-center text-black font-bold text-lg mb-6">
          {initials}
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>

        <p className="text-sm leading-relaxed text-white/70 min-h-[60px] mb-8">
          {description}
        </p>

        <ul className="space-y-3 mb-8 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-[#8c52ff] flex-shrink-0 mt-0.5" />
              <span className="text-white/70 text-xs font-light leading-relaxed">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex items-baseline gap-1 mb-6">
            <div className="text-3xl font-bold text-white">{price}</div>
            <div className="text-sm text-white/70">{period}</div>
          </div>

          <Link href="/register" className="w-full">
            <Button className="w-full bg-white/5 hover:bg-[#8c52ff] hover:text-white text-white border border-white/10 transition-colors uppercase text-xs tracking-wider">
              Choose Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const plans = [
    {
      icon: <Sprout className="w-4.5 h-4.5" />,
      category: "Free",
      title: "Discovery",
      description: "For hobbyists and testing",
      price: "$0",
      period: "/month",
      initials: "D",
      features: [
        "100 SMS / month included",
        "1 application",
        "100 contacts",
        "1 campaign",
        "100 recipients per campaign",
        "1 device connection",
        "Basic receipt webhooks",
        "Community support",
      ],
    },
    {
      icon: <Gem className="w-4.5 h-4.5" />,
      category: "Popular",
      title: "Professional",
      description: "For startups and small businesses",
      price: "$10",
      period: "/month",
      initials: "P",
      features: [
        "Unlimited SMS",
        "5 applications",
        "1,000 contacts",
        "5 campaigns",
        "1,000 recipients per campaign",
        "Up to 2 devices",
        "1 SIM per device",
        "Priority support",
        "API access & Advanced webhooks",
      ],
    },
    {
      icon: <Building2 className="w-4.5 h-4.5" />,
      category: "Enterprise",
      title: "Enterprise",
      description: "For large campaigns and fleets",
      price: "$99",
      period: "/month",
      initials: "E",
      features: [
        "Unlimited SMS & Apps",
        "Unlimited contacts & campaigns",
        "Unlimited recipients",
        "Unlimited devices",
        "4 SIMs per device",
        "White-label options",
        "Dedicated support",
        "Full API access & Advanced webhooks",
      ],
    },
  ];

  return (
    <div className="bg-[#05080A] min-h-screen font-sans flex flex-col text-white selection:bg-[#8c52ff]/30 selection:text-[#8c52ff]">
      <Header />
      <main className="grow">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-20 pt-10">
            <h1 className="text-4xl md:text-6xl font-light tracking-tighter mb-6">
              Simple and <span className="text-white/50">transparent.</span>
            </h1>
            <p className="text-xl text-white/60 font-light max-w-2xl">
              A clear freemium model. Start for free, pay as you grow. No hidden
              fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <PricingCard key={i} {...plan} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
