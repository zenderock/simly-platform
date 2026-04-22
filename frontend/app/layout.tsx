import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Providers from "@/components/providers";
import { Toaster as ToasterRadix } from "@/components/ui/toaster";
import { Toaster as ToasterSonner } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import SuspendedPostHogPageView from "@/components/providers/posthog-pageview";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Simly - Android SMS Gateway",
  description: "Transform your Android phone into a professional SMS gateway.",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <body className="antialiased">
        <Providers>
          <PostHogProvider>
            <SuspendedPostHogPageView />
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <ToasterRadix />
              <ToasterSonner
                position="bottom-right"
                richColors
                closeButton
                theme="light"
                toastOptions={{
                  style: {
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                    fontFamily: "var(--font-sans)",
                  },
                  className: "font-sans",
                }}
              />
            </ThemeProvider>
            <Analytics />
          </PostHogProvider>
        </Providers>
      </body>
    </html>
  );
}
