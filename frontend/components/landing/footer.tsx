"use client";

import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="border bg-[#05080A] border-white/10 border-t pt-20 pb-10">
      <div className="max-w-6xl mx-auto w-full flex flex-col">
        {/* Green Section */}
        <div className="relative bg-[#8c52ff] text-black w-full overflow-hidden border-x border-t border-white/10">
          <div className="absolute inset-0 grid grid-cols-4 w-full h-full pointer-events-none">
            <div className="border-r border-black/10 h-full"></div>
            <div className="border-r border-black/10 h-full"></div>
            <div className="border-r border-black/10 h-full"></div>
            <div className="h-full"></div>
          </div>

          <div className="relative z-10 px-6 py-16 md:px-12 md:py-20 flex flex-col justify-between min-h-[400px]">
            <a
              href="mailto:hello@zenderock.me"
              className="group flex items-start justify-between w-full mb-24 md:mb-32"
            >
              <div className="relative z-10 w-full flex justify-center items-end leading-none select-none pt-12">
                <h1 className="text-[12vw] md:text-[8rem] lg:text-[10rem] font-semibold tracking-tighter text-center leading-[0.75] mb-[-0.08em] mix-blend-screen text-outline">
                  SAY HELLO
                </h1>
              </div>

              <div className="pt-2 md:pt-6 absolute top-0 right-0 p-8">
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
                <p className="font-semibold">Simly Gateway.</p>
                <p className="max-w-[200px] text-black/80">Servelink</p>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Product
                </span>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/download"
                    className="hover:text-black/60 transition-colors"
                  >
                    Download
                  </Link>
                  <Link
                    href="/pricing"
                    className="hover:text-black/60 transition-colors"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/docs"
                    className="hover:text-black/60 transition-colors"
                  >
                    API Documentation
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Legal
                </span>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/legal/terms"
                    className="hover:text-black/60 transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                  <Link
                    href="/legal/privacy"
                    className="hover:text-black/60 transition-colors"
                  >
                    Privacy
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="block text-black/50 font-semibold tracking-tight">
                  Follow Us
                </span>
                <div className="flex flex-col gap-2">
                  <a
                    href="https://github.com/zenderock"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-black/60 transition-colors"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://x.com/iamzenderock"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-black/60 transition-colors"
                  >
                    Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative bg-[#05080A] text-white w-full overflow-hidden border-x border-b border-white/10">
          <div className="absolute inset-0 grid grid-cols-4 w-full h-full pointer-events-none">
            <div className="border-r border-white/10 h-full"></div>
            <div className="border-r border-white/10 h-full"></div>
            <div className="border-r border-white/10 h-full"></div>
            <div className="h-full"></div>
          </div>

          <div className="relative z-10 w-full flex justify-center items-end leading-none select-none pt-12">
            <h1 className="text-[24vw] md:text-[20rem] font-semibold tracking-tighter text-center leading-[0.75] mb-[-0.08em] mix-blend-screen text-outline">
              SIMLY
            </h1>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .text-outline {
          -webkit-text-stroke: 1px white;
          color: transparent;
        }
      `}</style>
    </footer>
  );
};
