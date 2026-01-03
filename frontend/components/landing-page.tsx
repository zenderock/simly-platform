"use client";
import React, { useEffect, useRef } from "react";
import {
  Menu,
  ArrowRight,
  LayoutGrid,
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

// Navigation Component
const Navigation: React.FC = () => {
  return (
    <header className="sticky bg-[#000000] w-full z-50 top-0 backdrop-blur-md border-b border-white/10">
      <div className="grid grid-cols-12 h-16 sm:h-20">
        {/* Left Links */}
        <div className="col-span-4 hidden md:flex items-center">
          <a
            href="#"
            className="flex items-center justify-center hover:text-white transition-colors text-xs font-medium tracking-wide h-full border-white/10 border-r pr-8 pl-8"
          >
            FEATURES
          </a>
          <a
            href="#"
            className="h-full px-8 flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10"
          >
            PRICING
          </a>
          <a
            href="#"
            className="h-full px-8 flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10"
          >
            USE CASES
          </a>
        </div>

        {/* Mobile Menu */}
        <div className="col-span-2 md:hidden flex items-center pl-6 border-r border-white/10">
          <Menu className="w-6 h-6 text-white" />
        </div>

        {/* Logo Center */}
        <div className="col-span-8 md:col-span-4 flex relative items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#6e3ff3] rounded-sm flex items-center justify-center text-black font-bold text-xs">
              S
            </div>
            <span className="font-semibold text-white tracking-tight">
              SIMLY
            </span>
          </div>
        </div>

        {/* Right Links */}
        <div className="col-span-2 md:col-span-4 flex items-center justify-end">
          <a
            href="#"
            className="h-full px-8 hidden md:flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10 border-l"
          >
            CLIENT LOGIN
          </a>
          <a
            href="#"
            className="h-full w-full md:w-auto px-8 flex items-center justify-center text-xs font-medium tracking-wide text-white hover:text-[#6e3ff3] transition-colors gap-2"
          >
            CONTACT
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </header>
  );
};

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
            <span className="flex h-2 w-2 rounded-full bg-[#6e3ff3]"></span>
            <p className="text-[#6e3ff3] text-xs tracking-widest uppercase text-white/70">
              Simly Android SMS Gateway v1.0
            </p>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] mb-8 font-light tracking-tighter">
            Transform your
            <br />
            phone into an
            <br />
            <span className="font-light tracking-tighter text-white bg-[#6e3ff3] px-2">
              SMS gateway.
            </span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed max-w-lg mb-12 font-light text-white/80">
            Send SMS via your own SIM card and mobile plan. A simple,
            affordable, and reliable API for your projects.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 border border-white/10 max-w-lg rounded-sm overflow-hidden gap-4">
            <button className="group flex items-center bg-[#474747] justify-center gap-3 px-8 py-5 hover:bg-[#575656] transition-all duration-300 border-b sm:border-b-0 sm:border-r border-white/10">
              <span className="text-white font-medium tracking-wide text-xs uppercase">
                Start for Free
              </span>
            </button>

            <button className="group flex items-center justify-center gap-3 px-8 py-5 hover:bg-white/5 transition-all duration-300">
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
            </button>
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
    <div
      className="overflow-hidden bg-gradient-to-r from-[#6e3ff3] to-[#000000] z-10 relative"
      style={{
        maskImage:
          "linear-gradient(210deg, transparent, black 0%, black 100%, transparent)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#6e3ff3]/10 via-[#05080A] to-[#05080A] opacity-40"></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#6e3ff3]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="z-10 flex lg:p-16 h-full pt-8 pr-8 pb-8 pl-8 relative items-center justify-center">
        <div className="overflow-hidden flex flex-col md:flex-row md:h-[500px] bg-[#0B0F13] w-full h-[600px] max-w-2xl border-white/10 border rounded-xl shadow-2xl backdrop-blur-xl">
          {/* Sidebar */}
          <div className="md:w-64 flex flex-col bg-[#080B0E]/60 w-full border-white/5 border-r pt-4 pr-4 pb-4 pl-4">
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-8 h-8 rounded bg-[#6e3ff3] flex items-center justify-center text-black font-semibold">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Simly</span>
                <span className="text-[10px] text-slate-500">Dashboard</span>
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto no-scrollbar flex-1">
              <div className="flex items-center gap-3 px-3 py-2 bg-[#6e3ff3]/10 text-[#6e3ff3] border border-[#6e3ff3]/20 rounded-lg cursor-pointer text-xs font-medium">
                <LayoutGrid className="w-4 h-4" />
                Overview
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs">
                <FileText className="w-4 h-4" />
                SMS Campaigns
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs">
                <Cpu className="w-4 h-4" />
                Devices
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs">
                <RefreshCw className="w-4 h-4" />
                Developers
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 p-6 flex flex-col bg-transparent relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-medium text-sm">Sent SMS</h3>
              <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-400 border border-white/5">
                This month
              </span>
            </div>

            <div className="mb-8">
              <div className="text-4xl text-white mb-1 font-light tracking-tighter">
                14,203
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="text-[#6e3ff3] bg-[#6e3ff3]/10 px-1 rounded">
                  99.8%
                </span>
                Delivery Rate
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-[#0E1216]/60 border border-white/5 rounded-lg p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Pending</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-medium text-white">0</span>
                    </div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-600" />
                </div>

                <div className="h-32 w-full relative mt-2">
                  <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-700">
                    <div className="border-b border-white/5 w-full h-0"></div>
                    <div className="border-b border-white/5 w-full h-0"></div>
                    <div className="border-b border-white/5 w-full h-0"></div>
                    <div className="border-b border-white/5 w-full h-0"></div>
                  </div>
                  <svg
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6e3ff3"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#6e3ff3"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 C40,75 80,90 120,60 C160,30 200,45 240,20 C280,5 300,15 310,5 L310,128 L0,128 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M0,80 C40,75 80,90 120,60 C160,30 200,45 240,20 C280,5 300,15 310,5"
                      fill="none"
                      stroke="#6e3ff3"
                      strokeWidth="2"
                    />
                    <circle
                      cx="98%"
                      cy="5%"
                      r="3"
                      fill="#6e3ff3"
                      stroke="#05080A"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Logo Marquee Component
const LogoMarquee: React.FC = () => {
  const logos = ["NODE.JS", "PYTHON", "PHP", "GOLANG", "JAVA", "CURL"];

  return (
    <div className="border bg-[#05080A] border-white/10 border-b group/footer">
      <div className="max-w-screen-2xl mr-auto ml-auto">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="col-span-12 md:col-span-2 py-8 px-6 md:px-10 border-b md:border-b-0 md:border-r border-white/10 flex items-center bg-[#05080A] relative z-20">
            <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
              COMPATIBILITY
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
            <span className="uppercase text-xs font-semibold text-[#6e3ff3] tracking-widest">
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
    <section className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24">
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="01"
          label="Features"
          title="Unmatched"
          subtitle="power."
          description="A complete suite of tools to manage your marketing SMS, transactional messages, and system notifications."
          buttonText="View documentation"
        />

        <section className="border z-10 bg-[#05080A] border-white/10 border-b relative">
          <div className="grid grid-cols-1 md:grid-cols-12 border border-white/10 border-b">
            <div className="col-span-12 md:col-span-4 md:p-12 md:border-b-0 md:border-r flex flex-col border-white/10 border-b pt-8 pr-8 pb-8 pl-8 justify-center">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-[#6e3ff3]" />
                <span className="text-[#6e3ff3] text-xs tracking-widest uppercase">
                  Infrastructure
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl text-white font-light tracking-tighter mb-4">
                Maximum reliability.
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Our local queuing and synchronization technology ensures your
                messages go out, even during temporary network outages.
              </p>
            </div>

            <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <ServiceCard
                title="REST API & Webhooks"
                description="Integrate SMS sending in a few lines of code. Receive real-time responses on your server."
              />
              <ServiceCard
                title="Background Mode"
                description="The Android app runs silently in the background. Your phone remains usable."
                icon={<Layers className="w-4 h-4 text-white" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 border border-white/10 border-b">
            <MiniFeature
              icon={<RefreshCw className="w-5 h-5" />}
              title="Dual SIM"
              subtitle="Native multi-SIM support."
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
    <div className="p-8 group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
      <div className="mb-6 relative h-24 w-full bg-slate-900/50 rounded border border-white/5 flex flex-col p-3 overflow-hidden">
        {icon ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute h-16 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="w-8 h-8 rounded bg-[#0E1216] border border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(198,249,31,0.1)]">
              {icon}
            </div>
            <div className="absolute top-4 right-10 w-2 h-2 bg-[#6e3ff3] rounded-full animate-pulse"></div>
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
                <stop offset="0%" stopColor="#6e3ff3" stopOpacity="1" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#6e3ff3]/10 blur-[40px] rounded-full group-hover:bg-[#6e3ff3]/20 transition-colors"></div>
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
      <div className="text-slate-400 group-hover:text-[#6e3ff3] transition-colors">
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
    <section className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24">
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="02"
          label="Use Cases"
          title="A solution for"
          subtitle="every need."
          description="Whether you are an indie developer, a startup, or a fleet manager, Simly adapts."
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
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6e3ff3] shadow-[0_0_10px_#6e3ff3]"></div>
                  <span className="text-[10px] text-[#6e3ff3] uppercase tracking-widest font-medium">
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
                <div className="w-24 h-[80%] bg-[#6e3ff3]/5 border-t border-l border-r border-[#6e3ff3]/30 relative">
                  <Layers className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#6e3ff3]" />
                </div>
              </div>
              <div className="relative z-10 mt-12">
                <div className="text-[64px] leading-none font-light text-[#6e3ff3] tracking-tighter mb-2">
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
      color: "#6e3ff3",
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
        <h3 className="text-white font-medium text-lg mb-2">SMS MARKETING</h3>
        <p className="text-xs leading-relaxed text-white/70">
          Create engaging campaigns with higher open rates using real mobile
          numbers.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {alerts.map((alert, i) => (
          <div key={i} className="group cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded ${
                    alert.color === "#6e3ff3"
                      ? "bg-[#6e3ff3]/10 border-[#6e3ff3]/20 text-[#6e3ff3]"
                      : "bg-white/5 border-white/10 text-slate-500 group-hover:text-white group-hover:border-white/20"
                  } border flex items-center justify-center transition-colors`}
                >
                  {typeof alert.icon === "string" ? alert.icon : alert.icon}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    alert.color === "#6e3ff3"
                      ? "text-[#6e3ff3]"
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
                  alert.color === "#6e3ff3"
                    ? "bg-[#6e3ff3] shadow-[0_0_10px_#6e3ff3]"
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
                <div className="absolute inset-0 bg-[#6e3ff3]/20 blur-[30px]"></div>
                <div className="relative z-10 text-[#6e3ff3]">
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

// Insights Section
const InsightsSection: React.FC = () => {
  const reports = [
    {
      icon: <Sprout className="w-4.5 h-4.5" />,
      category: "Free",
      title: "Discovery",
      description:
        "Ideal for testing. 1 Android Device. 100 SMS/month via API.",
      author: "0€",
      role: "/month",
      initials: "D",
    },
    {
      icon: <Gem className="w-4.5 h-4.5" />,
      category: "Recommended",
      title: "Pro",
      description:
        "For startups and SMEs. Unlimited devices. Unlimited sends. Priority support.",
      author: "19€",
      role: "/month",
      initials: "P",
    },
    {
      icon: <Building2 className="w-4.5 h-4.5" />,
      category: "Enterprise",
      title: "Agency",
      description:
        "White label solution for resellers and large fleet managers.",
      author: "Quote",
      role: "Custom",
      initials: "A",
    },
  ];

  return (
    <section className="border bg-[#05080A] border-white/10 border-b pt-24 pb-24">
      <div className="max-w-6xl mr-auto ml-auto pr-6 pl-6">
        <SectionHeader
          number="03"
          label="Pricing"
          title="Simple and"
          subtitle="transparent."
          description="A clear freemium model. Start for free, pay as you grow."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {reports.map((report, i) => (
            <ReportCard key={i} {...report} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Report Card Component
interface ReportCardProps {
  icon: React.ReactNode;
  category: string;
  title: string;
  description: string;
  author: string;
  role: string;
  initials: string;
}

const ReportCard: React.FC<ReportCardProps> = ({
  icon,
  category,
  title,
  description,
  author,
  role,
  initials,
}) => {
  return (
    <div className="group relative flex h-full flex-col bg-[#05080A]">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent"></div>
      </div>
      <div className="relative flex-1 flex flex-col p-10">
        <div className="flex items-center gap-2 text-[#6e3ff3] mb-6">
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase">
            {category}
          </span>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>

        <p className="text-sm leading-relaxed text-white/70 min-h-[100px]">
          {description}
        </p>
        <div className="mt-10 flex justify-end">
          <a
            href="#"
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
          </a>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 p-7 h-[88px]">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-white">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{author}</div>
          <div className="text-xs text-white/70">{role}</div>
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
      buttonText: "Download .APK",
      features: ["Android 8.0+", "Background Service"],
    },
    {
      label: "Web",
      title: "Client Area",
      description:
        "Connect your devices, manage API keys, and track your sends from the dashboard.",
      buttonText: "Create Account",
      features: ["Dashboard", "API Management"],
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
}

const ContactCard: React.FC<ContactCardProps> = ({
  label,
  title,
  description,
  buttonText,
  features,
}) => {
  return (
    <div className="flex flex-col group hover:bg-white/[0.04] transition-colors duration-300 h-full border-white/10 border rounded-none p-10 relative">
      <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-[#6e3ff3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-[#6e3ff3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-[#6e3ff3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-[#6e3ff3] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="mb-8">
        <span className="inline-block px-3 py-1 text-xs font-medium text-slate-300 border border-white/10 rounded bg-white/5 group-hover:text-[#6e3ff3] group-hover:border-[#6e3ff3] group-hover:bg-[#6e3ff3]/10 transition-colors duration-300">
          {label}
        </span>
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-3xl font-medium text-white tracking-tight">
          {title}
        </span>
      </div>
      <p className="text-white/70 text-sm mb-8 font-light">{description}</p>
      <button className="w-full py-4 mb-10 rounded-lg border border-white/10 bg-transparent text-white group-hover:bg-[#6e3ff3] group-hover:text-white group-hover:border-[#6e3ff3] transition-all duration-300 text-sm font-medium">
        {buttonText}
      </button>
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

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className="border bg-[#05080A] border-white/10 border-t pt-20 pb-10">
      <div className="max-w-6xl mx-auto w-full flex flex-col">
        {/* Green Section */}
        <div className="relative bg-[#6e3ff3] text-black w-full overflow-hidden border-x border-t border-white/10">
          <div className="absolute inset-0 grid grid-cols-4 w-full h-full pointer-events-none">
            <div className="border-r border-black/10 h-full"></div>
            <div className="border-r border-black/10 h-full"></div>
            <div className="border-r border-black/10 h-full"></div>
            <div className="h-full"></div>
          </div>

          <div className="relative z-10 px-6 py-16 md:px-12 md:py-20 flex flex-col justify-between min-h-[400px]">
            <a
              href="mailto:hello@simly.io"
              className="group flex items-start justify-between w-full mb-24 md:mb-32"
            >
              <span className="text-4xl sm:text-6xl md:text-7xl lg:text-[7rem] leading-none font-semibold tracking-tighter break-all">
                HELLO@SIMLY.IO
              </span>
              <div className="pt-2 md:pt-6">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-10 h-10 md:w-20 md:h-20 transform group-hover:-translate-y-2 group-hover:translate-x-2 transition-transform duration-300"
                >
                  <path d="M7 7h10v10M7 17 17 7" />
                </svg>
              </div>
            </a>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 md:text-base leading-relaxed z-20 text-sm font-medium relative">
              <div className="flex flex-col gap-4">
                <p className="font-semibold">Simly Inc.</p>
                <p className="max-w-[200px] text-black/80">Paris, France</p>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Product
                </span>
                <div className="flex flex-col gap-2">
                  <a href="#" className="hover:text-black/60 transition-colors">
                    Download
                  </a>
                  <a href="#" className="hover:text-black/60 transition-colors">
                    Pricing
                  </a>
                  <a href="#" className="hover:text-black/60 transition-colors">
                    API Documentation
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Legal
                </span>
                <div className="flex flex-col gap-2">
                  <a href="#" className="hover:text-black/60 transition-colors">
                    Terms & Conditions
                  </a>
                  <a href="#" className="hover:text-black/60 transition-colors">
                    Privacy
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Follow Us
                </span>
                <div className="flex flex-col gap-2">
                  <a href="#" className="hover:text-black/60 transition-colors">
                    GitHub
                  </a>
                  <a href="#" className="hover:text-black/60 transition-colors">
                    Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Black Section */}
        <div className="relative bg-[#05080A] text-white w-full overflow-hidden border-x border-b border-white/10">
          <div className="absolute inset-0 grid grid-cols-4 w-full h-full pointer-events-none opacity-20">
            <div className="border-r border-white/20 h-full"></div>
            <div className="border-r border-white/20 h-full"></div>
            <div className="border-r border-white/20 h-full"></div>
            <div className="h-full"></div>
          </div>

          <div className="relative z-10 w-full flex justify-center items-end leading-none select-none pt-12">
            <h1 className="text-[24vw] md:text-[20rem] font-semibold tracking-tighter text-center leading-[0.75] mb-[-0.08em] mix-blend-screen text-outline">
              SIMLY
            </h1>
          </div>
        </div>
      </div>
    </footer>
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
    <div className="bg-[#05080A] min-h-screen flex flex-col overflow-x-hidden selection:bg-[#6e3ff3]/30 selection:text-[#6e3ff3] text-white/70">
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

      <Navigation />
      <main className="grow flex flex-col">
        <HeroSection />
        <LogoMarquee />
        <ServicesSection />
        <WhyUsSection />
        <InsightsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
