
import { Atom } from "lucide-react"
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Atom className="size-4" />
            </div>
            Simly
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {children}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale bg-zinc-900" />
        <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
           <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Transform your Android phone into a professional SMS gateway. Simly is the game changer we needed for our notification infrastructure.&rdquo;
            </p>
            <footer className="text-sm">Sofia Davis, CTO at TechCorp</footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
