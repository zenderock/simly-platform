"use client";

import React, { useEffect, useRef } from "react";
import {
  FileText,
  MoreHorizontal,
  Gem,
  ShieldCheck,
  Globe,
  Landmark,
  DollarSign,
  Building2,
  Bitcoin,
  Layers,
  Home,
  Sprout,
  Cpu,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "./landing/footer";
import { Header } from "./landing/header";

// Hero Section Component
const HeroSection: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 border-white/10 border-b">
      {/* Left Section */}
      <div className="relative overflow-hidden flex flex-col lg:px-20 lg:py-24 pt-16 pr-6 pb-16 pl-6 justify-center border-white/10 border-r bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-900/40 via-[#05080A] to-[#05080A]">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute right-0 top-0 h-full w-full lg:w-[65%] overflow-hidden opacity-80">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#05080A] via-[#05080A]/70 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[#8c52ff]"></span>
            <p className="text-[#8c52ff] text-xs tracking-widest uppercase text-white/70">
              Simly Android SMS Gateway v1.0
            </p>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] mb-8 font-light tracking-tighter">
            Global SMS
            <br />
            infrastructure.
            <br />
            <span className="font-light tracking-tighter text-white bg-[#8c52ff] px-2">
              Powered by you.
            </span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed max-w-lg mb-12 font-light text-white/80">
            The most cost-effective way to send transactional and marketing SMS.
            No hidden fees, no per-message costs. Just pure execution.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 border border-white/10 max-w-lg rounded-sm overflow-hidden">
            <Link
              href="/register"
              className="group flex items-center bg-[#474747] justify-center gap-3 px-8 py-5 hover:bg-[#575656] transition-all duration-300 border-b sm:border-b-0 sm:border-r border-white/10"
            >
              <span className="text-white font-medium tracking-wide text-xs uppercase">
                Start for Free
              </span>
            </Link>

            <Link
              href="/docs"
              className="group flex items-center justify-center gap-3 px-8 py-5 hover:bg-white/5 transition-all duration-300"
            >
              <span className="text-white font-medium tracking-wide text-xs uppercase">
                Documentation
              </span>
              <svg
                className="w-4 h-4 text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 7h10v10M7 17 17 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Section - Dashboard */}
      <DashboardMockup />
    </div>
  );
};

// Dashboard Mockup Component
const DashboardMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-[600px] mx-auto md:max-w-none">
      <div className="relative z-10  overflow-hidden shadow-2xl border border-white/10 bg-[#8c52ff]">
        <Image
          src="/hero.png"
          alt="Simly Dashboard"
          width={1200}
          height={800}
          className="w-full h-auto object-cover"
          priority
        />
      </div>

      {/* Background Glow Effect */}
      <div className="absolute -inset-4 bg-[#8c52ff]/20 blur-3xl -z-10 rounded-full opacity-50"></div>
    </div>
  );
};

// Logo Marquee Component
const LogoMarquee: React.FC = () => {
  const logos = [
    "SERVELINK SPACE",
    "FOCUST AGENCY",
    "AUBIGO PLATFORM",
    "UNIVERSAL SALE C",
    "COMMERCIFY",
    "WOILA DIGITAL",
  ];

  return (
    <div className="border bg-[#05080A] border-white/10 border-b group/footer">
      <div className="max-w-screen-2xl mr-auto ml-auto">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="col-span-12 md:col-span-2 py-8 px-6 md:px-10 border-b md:border-b-0 md:border-r border-white/10 flex items-center bg-[#05080A] relative z-20">
            <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
              COMPANIES
            </span>
          </div>

          <div
            className="col-span-12 md:col-span-10 relative overflow-hidden h-20 flex items-center"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          >
            <div className="animate-marquee flex">
              {[...logos, ...logos].map((logo, i) => (
                <div
                  key={i}
                  className="w-56 h-20 flex-shrink-0 flex items-center justify-center border-r border-white/10 opacity-40 hover:opacity-100 transition-opacity"
                >
                  <span className="text-lg font-semibold text-white tracking-tighter">
                    {logo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee-scroll 80s linear infinite;
        }
        .group\\/footer:hover .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

// Section Header Component
interface SectionHeaderProps {
  number: string;
  label: string;
  title: string;
  subtitle?: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  number,
  label,
  title,
  subtitle,
  description,
  buttonText,
  buttonLink,
}) => {
  return (
    <div className="mb-16 relative">
      <div
        className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"
        aria-hidden="true"
      ></div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 z-10 relative">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="uppercase text-xs font-semibold text-[#8c52ff] tracking-widest">
              {number}. {label}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl text-white font-light tracking-tighter mb-4 leading-[1.1]">
            {title}
            {subtitle && <span className="block">{subtitle}</span>}
          </h2>

          <p className="text-lg max-w-md text-white/70">{description}</p>
        </div>

        {buttonText && (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={buttonLink || "#"}
              className="sm:w-auto hover:bg-slate-200 transition-colors font-medium text-black text-center bg-white w-full rounded-none pt-3 pr-6 pb-3 pl-6"
            >
              {buttonText}
            </a>
          </div>
        )}
      </div>

      <div className="mt-12 h-[1px] w-full bg-gradient-to-r from-slate-800 via-slate-700 to-transparent"></div>
    </div>
  );
};

// Services Section
const ServicesSection: React.FC = () => {
  return (
    <section
      className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24"
      id="features"
    >
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="01"
          label="Features"
          title="Unmatched"
          subtitle="infrastructure."
          description="A pro-grade engine designed for high-volume execution, automated compliance, and developer happiness."
          buttonText="View documentation"
          buttonLink="/docs"
        />

        <section className="border z-10 bg-[#05080A] border-white/10 border-b relative">
          <div className="grid grid-cols-1 md:grid-cols-12 border border-white/10 border-b">
            <div className="col-span-12 md:col-span-4 md:p-12 md:border-b-0 md:border-r flex flex-col border-white/10 border-b pt-8 pr-8 pb-8 pl-8 justify-center">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-[#8c52ff]" />
                <span className="text-[#8c52ff] text-xs tracking-widest uppercase">
                  Infrastructure
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl text-white font-light tracking-tighter mb-4">
                Smart Dispatcher.
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Our intelligent routing engine automatically prioritizes OTPs to
                ensure critical codes arrive first, while managing massive
                marketing bursts with surgical precision.
              </p>
            </div>

            <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 divide-white/10 border-white/10">
              <div className="border-b border-white/10 sm:border-r">
                <ServiceCard
                  title="Unified 2-Way SMS"
                  description="Send and receive messages with a single API. Build chatbots, handle replies, and sync everything to your unified inbox."
                  icon={<RefreshCw className="w-4 h-4 text-white" />}
                />
              </div>
              <div className="border-b border-white/10">
                <ServiceCard
                  title="Compliance Engine"
                  description="Automated opt-out management. We handle 'STOP' keywords and blacklisting instantly to keep your SIM cards safe."
                  icon={<ShieldCheck className="w-4 h-4 text-white" />}
                />
              </div>
              <div className="sm:border-r border-white/10">
                <ServiceCard
                  title="Mass Campaigns"
                  description="Pro-grade orchestration for high-volume engagement. Real-time tracking and automated retry logic."
                  icon={<FileText className="w-4 h-4 text-white" />}
                />
              </div>
              <div>
                <ServiceCard
                  title="Smart Audience"
                  description="Native contact management with deep segmentation and global blacklist enforcement. Your CRM, automated."
                  icon={<MoreHorizontal className="w-4 h-4 text-white" />}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 border border-white/10 border-b">
            <MiniFeature
              icon={<AreaChart className="w-5 h-5" />}
              title="Command Center"
              subtitle="Live dispatch monitoring."
            />
            <MiniFeature
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Security"
              subtitle="End-to-end encryption."
            />
            <MiniFeature
              icon={<Globe className="w-5 h-5" />}
              title="Universal"
              subtitle="Works everywhere."
            />
            <MiniFeature
              icon={<DollarSign className="w-5 h-5" />}
              title="Cost-effective"
              subtitle="Fixed monthly cost."
            />
          </div>
        </section>
      </div>
    </section>
  );
};

// Service Card Component
interface ServiceCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="p-8 group hover:bg-white/2 transition-colors relative overflow-hidden">
      <div className="mb-6 relative h-24 w-full bg-slate-900/50 rounded border border-white/5 flex flex-col p-3 overflow-hidden">
        {icon ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute h-16 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="w-8 h-8 rounded bg-[#0E1216] border border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(198,249,31,0.1)]">
              {icon}
            </div>
            <div className="absolute top-4 right-10 w-2 h-2 bg-[#8c52ff] rounded-full animate-pulse"></div>
          </div>
        ) : (
          <svg
            className="w-full h-full text-slate-600"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0 40 L10 35 L20 38 L30 30 L40 32 L50 20 L60 25 L70 15 L80 18 L90 5 L100 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            <path
              d="M0 40 L10 35 L20 38 L30 30 L40 32 L50 20 L60 25 L70 15 L80 18 L90 5 L100 10 L100 40 L0 40"
              fill="url(#grad1)"
              opacity="0.2"
            />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8c52ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#8c52ff]/10 blur-[40px] rounded-full group-hover:bg-[#8c52ff]/20 transition-colors"></div>
      </div>
      <h3 className="text-white font-medium mb-2 flex items-center gap-2">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-white/70">{description}</p>
    </div>
  );
};

// Mini Feature Component
interface MiniFeatureProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const MiniFeature: React.FC<MiniFeatureProps> = ({ icon, title, subtitle }) => {
  return (
    <div className="flex flex-col gap-3 group hover:bg-white/[0.02] transition-colors pt-6 pr-6 pb-6 pl-6">
      <div className="text-slate-400 group-hover:text-[#8c52ff] transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="text-white text-sm font-medium">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

// Why Us Section
const WhyUsSection: React.FC = () => {
  return (
    <section
      className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24"
      id="use-cases"
    >
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="02"
          label="Use Cases"
          title="From OTPs to"
          subtitle="Mass Marketing."
          description="Power transactional alerts, appointment reminders, or global marketing campaigns from a single dashboard."
        />

        <section className="border z-10 bg-[#05080A] border-white/10 border-b relative">
          {/* Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-white/10">
            {/* Radar */}
            <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-white/10 relative h-[360px] overflow-hidden group">
              <div className="absolute inset-0 flex items-center justify-center -translate-y-16 opacity-80">
                <div className="absolute w-[280px] h-[280px] rounded-full border border-white/5"></div>
                <div className="absolute w-[200px] h-[200px] rounded-full border border-white/5"></div>
                <div className="absolute w-[120px] h-[120px] rounded-full border border-white/5"></div>
                <div className="absolute w-[280px] h-[280px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg_240deg,rgba(198,249,31,0.2)_360deg)] animate-[spin_4s_linear_infinite]"></div>
                <div className="absolute top-10 left-10 flex items-center gap-2 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8c52ff] shadow-[0_0_10px_#8c52ff]"></div>
                  <span className="text-[10px] text-[#8c52ff] uppercase tracking-widest font-medium">
                    Active Monitoring
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-8 z-10 bg-gradient-to-t from-[#05080A] via-[#05080A]/80 to-transparent pt-20">
                <h3 className="text-white font-medium text-lg mb-2">
                  NOTIFICATIONS
                </h3>
                <p className="text-xs leading-relaxed pr-4 text-white/70">
                  Send OTPs, appointment reminders, or system alerts in
                  real-time.
                </p>
              </div>
            </div>

            {/* Alerts */}
            <AlertsPanel />

            {/* Asset Grid */}
            <AssetGrid />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="col-span-12 md:col-span-8 md:border-b-0 md:border-r border-white/10 border-b pt-16 pr-8 pb-8 pl-8 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-full h-full flex items-end justify-end gap-[1px] opacity-100 pointer-events-none pr-8">
                <div className="w-24 h-[20%] bg-white/[0.02] border-t border-l border-r border-white/10"></div>
                <div className="w-24 h-[40%] bg-white/[0.02] border-t border-l border-r border-white/10"></div>
                <div className="w-24 h-[60%] bg-white/[0.02] border-t border-l border-r border-white/10"></div>
                <div className="w-24 h-[80%] bg-[#8c52ff]/5 border-t border-l border-r border-[#8c52ff]/30 relative">
                  <Layers className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#8c52ff]" />
                </div>
              </div>
              <div className="relative z-10 mt-12">
                <div className="text-[64px] leading-none font-light text-[#8c52ff] tracking-tighter mb-2">
                  10x
                </div>
                <h3 className="text-white font-medium text-lg mb-2 uppercase tracking-wide">
                  Cheaper
                </h3>
                <p className="text-sm leading-relaxed max-w-md text-white/70">
                  Save massively compared to traditional APIs like Twilio or
                  Vonage. Pay for the plan, not per message.
                </p>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 p-8 flex flex-col justify-end pt-16 h-full min-h-[300px]">
              <div className="mt-auto">
                <h3 className="text-white font-medium text-lg mb-2 uppercase tracking-wide">
                  Global Scale
                </h3>
                <p className="text-sm leading-relaxed text-white/70">
                  Compatible with all global carriers. If your SIM can send an
                  SMS, Simly can automate it.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

// Alerts Panel Component
const AlertsPanel: React.FC = () => {
  const alerts = [
    {
      icon: "↑",
      label: "Delivery Rate 99%",
      time: "NOW",
      color: "#8c52ff",
      width: "w-full",
    },
    {
      icon: <Newspaper className="w-3.5 h-3.5" />,
      label: "Staging Server",
      time: "2H AGO",
      color: "slate",
      width: "w-1/2",
    },
    {
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      label: "Synchronization",
      time: "1D AGO",
      color: "slate",
      width: "w-3/4",
    },
  ];

  return (
    <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-white/10 p-8 flex flex-col h-[360px]">
      <div className="mb-6">
        <h3 className="text-white font-medium text-lg mb-2 uppercase">
          Command Center
        </h3>
        <p className="text-xs leading-relaxed text-white/70">
          Monitor your dispatch live. Real-time logging of every message
          attempt, delivery status, and carrier response.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {alerts.map((alert, i) => (
          <div key={i} className="group cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded ${
                    alert.color === "#8c52ff"
                      ? "bg-[#8c52ff]/10 border-[#8c52ff]/20 text-[#8c52ff]"
                      : "bg-white/5 border-white/10 text-slate-500 group-hover:text-white group-hover:border-white/20"
                  } border flex items-center justify-center transition-colors`}
                >
                  {typeof alert.icon === "string" ? alert.icon : alert.icon}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    alert.color === "#8c52ff"
                      ? "text-[#8c52ff]"
                      : "text-slate-500 group-hover:text-white"
                  } transition-colors`}
                >
                  {alert.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-600">{alert.time}</span>
            </div>
            <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${alert.width} ${
                  alert.color === "#8c52ff"
                    ? "bg-[#8c52ff] shadow-[0_0_10px_#8c52ff]"
                    : "bg-slate-700 group-hover:bg-slate-500"
                } transition-colors`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Asset Grid Component
const AssetGrid: React.FC = () => {
  const assetIcons = [
    { icon: <DollarSign className="w-4.5 h-4.5" />, position: [0, 2] },
    { icon: <Building2 className="w-4.5 h-4.5" />, position: [0, 3] },
    { icon: <Bitcoin className="w-4.5 h-4.5" />, position: [1, 1] },
    { icon: <Gem className="w-4.5 h-4.5" />, position: [2, 0] },
    { icon: <Home className="w-4.5 h-4.5" />, position: [2, 1] },
    { icon: <Landmark className="w-4.5 h-4.5" />, position: [2, 2] },
  ];

  return (
    <div className="col-span-12 md:col-span-4 h-[360px] relative bg-[#05080A]">
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 divide-x divide-y divide-white/5 border-b border-white/5">
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const asset = assetIcons.find(
            (a) => a.position[0] === row && a.position[1] === col
          );
          const isCenter = row === 1 && col === 2;

          if (isCenter) {
            return (
              <div
                key={i}
                className="flex items-center justify-center relative"
              >
                <div className="absolute inset-0 bg-[#8c52ff]/20 blur-[30px]"></div>
                <div className="relative z-10 text-[#8c52ff]">
                  <Cpu className="w-12 h-12" strokeWidth={1.5} />
                </div>
              </div>
            );
          }

          if (row === 1 && col === 3) {
            return (
              <div
                key={i}
                className="flex items-center justify-center bg-white/[0.01]"
              >
                <div className="w-10 h-10 rounded bg-[#15191E] flex items-center justify-center text-[8px] font-bold text-slate-600 tracking-wider">
                  IOT
                </div>
              </div>
            );
          }

          if (asset) {
            return (
              <div
                key={i}
                className="flex items-center justify-center bg-white/[0.01]"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                  {asset.icon}
                </div>
              </div>
            );
          }

          return <div key={i} className="bg-white/[0.01]"></div>;
        })}
      </div>
    </div>
  );
};

// Chart Components

const DeliveryRadialChart = () => {
  const data = [{ name: "Delivery Rate", value: 99.8, fill: "#8c52ff" }];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 relative">
      {/* Chart Title */}
      <div className="absolute top-6 left-6 z-10">
        <h4 className="text-white text-sm font-medium tracking-tight">
          Delivery Success
        </h4>
        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mt-1">
          Last 30 days
        </p>
      </div>

      <div className="relative w-full h-[240px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="75%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-200}
          >
            <defs>
              <linearGradient id="radialGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8c52ff" />
                <stop offset="100%" stopColor="#9C7DFF" />
              </linearGradient>
            </defs>
            <PolarRadiusAxis
              type="number"
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              background={{ fill: "#ffffff", fillOpacity: 0.05 }}
              dataKey="value"
              cornerRadius={20}
              fill="url(#radialGradient)"
            />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-4xl font-light tracking-tighter"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              99.8%
            </text>
            <text
              x="50%"
              y="62%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-emerald-400 text-xs font-medium tracking-wide"
            >
              +2.4% vs last mo
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const VolumeAreaChart = () => {
  const data = [
    { name: "Mon", value: 4000 },
    { name: "Tue", value: 3000 },
    { name: "Wed", value: 2000 },
    { name: "Thu", value: 2780 },
    { name: "Fri", value: 1890 },
    { name: "Sat", value: 2390 },
    { name: "Sun", value: 3490 },
  ];

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between relative">
      <div className="z-10">
        <h4 className="text-white text-sm font-medium tracking-tight">
          Weekly Volume
        </h4>
        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mt-1">
          Last 7 days
        </p>
      </div>

      <div className="h-[200px] w-full -mx-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8c52ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8c52ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(5, 8, 10, 0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
                backdropFilter: "blur(4px)",
                padding: "8px 12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: 500 }}
              labelStyle={{ display: "none" }}
              cursor={{
                stroke: "rgba(255,255,255,0.2)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8c52ff"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#volumeGradient)"
              activeDot={{ r: 6, strokeWidth: 0, fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LatencyBarChart = () => {
  const data = [
    { name: "P50", value: 120 },
    { name: "P75", value: 200 },
    { name: "P90", value: 350 },
    { name: "P99", value: 580 },
  ];

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between relative">
      <div className="z-10">
        <h4 className="text-white text-sm font-medium tracking-tight">
          Low Latency
        </h4>
        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mt-1">
          Response time (ms)
        </p>
      </div>

      <div className="h-[200px] w-full -mx-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={40}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8c52ff" />
                <stop offset="100%" stopColor="#8c52ff" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                backgroundColor: "rgba(5, 8, 10, 0.9)",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
                backdropFilter: "blur(4px)",
                padding: "8px 12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: 500 }}
              labelStyle={{ display: "none" }}
            />
            <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fillOpacity={index === 3 ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Insights Section
const InsightsSection: React.FC = () => {
  return (
    <section className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24">
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="03"
          label="Insights"
          title="Execution"
          subtitle="transparency."
          description="Live event streaming and deep analytics. Know exactly how your traffic is performing across all devices."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart 1: Delivery Rate */}
          <div className="bg-[#0A0D11] border border-white/5 rounded-xl overflow-hidden min-h-[300px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/10 transition-colors group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <DeliveryRadialChart />
          </div>

          {/* Chart 2: Volume */}
          <div className="bg-[#0A0D11] border border-white/5 rounded-xl overflow-hidden min-h-[300px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/10 transition-colors group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <VolumeAreaChart />
          </div>

          {/* Chart 3: Latency */}
          <div className="bg-[#0A0D11] border border-white/5 rounded-xl overflow-hidden min-h-[300px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/10 transition-colors group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <LatencyBarChart />
          </div>
        </div>
      </div>
    </section>
  );
};

// Pricing Section
const PricingSection: React.FC = () => {
  const plans = [
    {
      icon: <Sprout className="w-4.5 h-4.5" />,
      category: "Free",
      title: "Discovery",
      description: "Perfect for testing and small-scale automation.",
      price: "$0",
      period: "/month",
      initials: "D",
      features: [
        "100 SMS / month included",
        "1 application",
        "100 contacts & 1 campaign",
        "1 device connection",
        "Standard latency dispatch",
        "Basic receipt webhooks",
        "Community support",
      ],
    },
    {
      icon: <Gem className="w-4.5 h-4.5" />,
      category: "Popular",
      title: "Professional",
      description: "For startups needing high-volume reliability.",
      price: "$10",
      period: "/month",
      initials: "P",
      features: [
        "Unlimited SMS volume",
        "1,000 contacts & 5 campaigns",
        "Up to 2 devices",
        "Smart Priority: Normal",
        "Advanced Webhooks (JSON)",
        "Campaign Command Center",
        "Opt-out Compliance Engine",
      ],
    },
    {
      icon: <Building2 className="w-4.5 h-4.5" />,
      category: "Enterprise",
      title: "Enterprise",
      description: "Pro-grade infrastructure for massive fleets.",
      price: "$99",
      period: "/month",
      initials: "E",
      features: [
        "Unlimited SMS & Apps",
        "Unlimited Audience & Campaigns",
        "Unlimited devices / fleets",
        "Smart Priority: High (OTPs)",
        "Sim-slot steering",
        "White-label options",
        "Dedicated Account Manager",
      ],
    },
  ];

  return (
    <section
      className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24"
      id="pricing"
    >
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="04"
          label="Pricing"
          title="Simple and"
          subtitle="transparent."
          description="A clear freemium model. Start for free, pay as you grow."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {plans.map((plan, i) => (
            <PricingCard key={i} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Card Component (Renamed from ReportCard)
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
    <div className="group relative flex h-full flex-col bg-[#05080A]">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent"></div>
      </div>
      <div className="relative flex-1 flex flex-col p-10">
        <div className="flex items-center gap-2 text-[#8c52ff] mb-6">
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase">
            {category}
          </span>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>

        <p className="text-sm leading-relaxed text-white/70 min-h-[60px] mb-8">
          {description}
        </p>

        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#c6f91f] flex-shrink-0 mt-0.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-white/70 text-xs font-light leading-relaxed">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex justify-end">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors border-b border-white/20 hover:border-white/50 pb-0.5"
          >
            Choose this plan
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M7 7h10v10M7 17 17 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 p-7 h-[88px]">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-white">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{price}</div>
          <div className="text-xs text-white/70">{period}</div>
        </div>
      </div>
    </div>
  );
};

// Contact Section
const ContactSection: React.FC = () => {
  const plans = [
    {
      label: "Android",
      title: "Download App",
      description:
        "Start by installing our gateway on your Android phone. 2-minute setup via QR Code.",
      buttonText: "Download app",
      features: ["Android 8.0+", "Background Service"],
      link: "/download",
      footerText:
        "Not on Play Store (Google restrictions) - Safe and signed file",
    },
    {
      label: "Web",
      title: "Client Area",
      description:
        "Connect your devices, manage API keys, and track your sends from the dashboard.",
      buttonText: "Create Account",
      features: ["Dashboard", "API Management"],
      link: "/register",
    },
  ];

  return (
    <section className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          number="04"
          label="Get Started"
          title="Ready to send"
          subtitle="your first SMS?"
          description="Join hundreds of developers who use Simly daily."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <ContactCard key={i} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Contact Card Component
interface ContactCardProps {
  label: string;
  title: string;
  description: string;
  buttonText: string;
  features: string[];
  link: string;
  footerText?: string;
}

const ContactCard: React.FC<ContactCardProps> = ({
  label,
  title,
  description,
  buttonText,
  features,
  link,
  footerText,
}) => {
  return (
    <div className="flex flex-col group hover:bg-white/[0.04] transition-colors duration-300 h-full border-white/10 border rounded-none p-10 relative">
      <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-[#8c52ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-[#8c52ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-[#8c52ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-[#8c52ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="mb-8">
        <span className="inline-block px-3 py-1 text-xs font-medium text-slate-300 border border-white/10 rounded bg-white/5 group-hover:text-[#8c52ff] group-hover:border-[#8c52ff] group-hover:bg-[#8c52ff]/10 transition-colors duration-300">
          {label}
        </span>
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-3xl font-medium text-white tracking-tight">
          {title}
        </span>
      </div>
      <p className="text-white/70 text-sm mb-8 font-light">{description}</p>
      <Link
        href={link}
        className="w-full block text-center items-center gap-2 py-4 mb-2 rounded-lg border border-white/10 bg-transparent text-white group-hover:bg-[#8c52ff] group-hover:text-white group-hover:border-[#8c52ff] transition-all duration-300 text-sm font-medium"
      >
        {buttonText}
      </Link>
      {footerText && (
        <p className="text-[10px] text-white/40 mb-10 text-center italic">
          {footerText}
        </p>
      )}
      <div className="mt-auto">
        <ul className="space-y-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-white/70 flex-shrink-0"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-white/70 text-sm font-light">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Scroll Animation Hook
const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("is-visible");
            }, i * 100);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(
      "main h1, main h2, main h3, main p, main button, main a.btn, main .group, main .grid > div, footer h1, footer a, footer p, footer span"
    );
    elements.forEach((el) => {
      if (
        !el.closest(".animate-marquee") &&
        !el.closest("script") &&
        !el.closest("style")
      ) {
        el.classList.add("reveal-on-scroll");
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);
};

// Main App Component
export default function SimlyLandingPage() {
  useScrollAnimation();

  return (
    <div className="bg-[#05080A] min-h-screen flex flex-col overflow-x-hidden selection:bg-[#8c52ff]/30 selection:text-[#8c52ff] text-white/70">
      <style>{`
        
        body {
          font-family: 'Poppins', sans-serif;
          background-color: #05080A;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        
        .reveal-on-scroll {
          animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          animation-play-state: paused;
        }
        
        .reveal-on-scroll.is-visible {
          animation-play-state: running;
        }

        .text-outline {
          -webkit-text-stroke: 1px white;
          color: transparent;
        }
      `}</style>

      <Header />
      <main className="grow flex flex-col">
        <HeroSection />
        <LogoMarquee />
        <ServicesSection />
        <WhyUsSection />
        <InsightsSection />
        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
