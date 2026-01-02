
import { IconCircleCheck, IconStar } from "@tabler/icons-react"
import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="#" className="flex items-center gap-2 font-medium">
            <Image src="/logo-dark.png" alt="Simly" width={100} height={100} className="dark:hidden" />
            <Image src="/logo-light.png" alt="Simly" width={100} height={100} className="hidden dark:block" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 lg:block">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          {/* Main Message */}
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Turn your phone into a professional SMS gateway
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed">
                Enterprise-grade SMS API with real-time monitoring and complete control over your messaging infrastructure.
              </p>
            </div>
            
            <div className="flex items-center gap-8 text-blue-100">
              <div className="flex items-center gap-2">
                <IconCircleCheck className="h-5 w-5" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCircleCheck className="h-5 w-5" />
                <span>Real-time alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCircleCheck className="h-5 w-5" />
                <span>Enterprise security</span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <IconStar key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-blue-100">Trusted by 500+ developers</span>
            </div>
            
            <blockquote className="space-y-3">
              <p className="text-lg leading-relaxed">
                "Simly transformed our notification infrastructure. What used to take weeks now works in minutes."
              </p>
              <footer className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-semibold">SD</span>
                </div>
                <div>
                  <div className="font-medium">Sofia Davis</div>
                  <div className="text-sm text-blue-100">CTO at TechCorp</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}
