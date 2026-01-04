"use client";

import React from "react";
import { Menu, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky bg-[#000000] w-full z-50 top-0 backdrop-blur-md border-b border-white/10">
      <div className="grid grid-cols-12 h-16 sm:h-20">
        {/* Left Links */}
        <div className="col-span-4 hidden md:flex items-center">
          <Link
            href="/#features"
            className="flex items-center justify-center hover:text-white transition-colors text-xs font-medium tracking-wide h-full border-white/10 border-r pr-8 pl-8 text-white/70"
          >
            FEATURES
          </Link>
          <Link
            href="/pricing"
            className="h-full px-8 flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10 text-white/70"
          >
            PRICING
          </Link>
          <Link
            href="/use-cases"
            className="h-full px-8 flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10 text-white/70"
          >
            USE CASES
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="col-span-2 md:hidden flex items-center pl-6 border-r border-white/10">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:text-white/70 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Logo Center */}
        <div className="col-span-8 md:col-span-4 flex relative items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-light.png" alt="Logo" width={100} height={100} />
          </Link>
        </div>

        {/* Right Links */}
        <div className="col-span-2 md:col-span-4 flex items-center justify-end">
          <Link
            href="/login"
            className="h-full px-8 hidden md:flex items-center justify-center text-xs font-medium tracking-wide hover:text-white transition-colors border-r border-white/10 border-l text-white/70"
          >
            LOGIN
          </Link>
          <Link
            href="/register"
            className="h-full w-full md:w-auto px-8 flex items-center justify-center text-xs font-medium tracking-wide text-white hover:text-[#8c52ff] transition-colors gap-2"
          >
            REGISTER
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent"></div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#05080A] border-b border-white/10 flex flex-col md:hidden animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/#features"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-6 py-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5 transition-colors"
          >
            FEATURES
          </Link>
          <Link
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-6 py-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5 transition-colors"
          >
            PRICING
          </Link>
          <Link
            href="/use-cases"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-6 py-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5 transition-colors"
          >
            USE CASES
          </Link>
          <Link
            href="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-6 py-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 border-b border-white/5 transition-colors"
          >
            LOGIN
          </Link>
        </div>
      )}
    </header>
  );
};
