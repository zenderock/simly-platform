import Image from "next/image";
import Link from "next/link";
import Prism from "@/components/Prism";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 font-sans">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/logo-dark.png"
              alt="Simly"
              width={100}
              height={100}
              className="dark:hidden"
            />
            <Image
              src="/logo-light.png"
              alt="Simly"
              width={100}
              height={100}
              className="hidden dark:block"
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-black lg:block">
        <div style={{ width: "100%", height: "100dvh", position: "relative" }}>
          <Prism
            animationType="3drotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={1.8}
            hueShift={0}
            colorFrequency={2}
            noise={0.5}
            suspendWhenOffscreen={true}
            glow={1}
          />
        </div>
      </div>
    </div>
  );
}
