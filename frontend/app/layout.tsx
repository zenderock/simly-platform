import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Providers from "@/components/providers";
import { Toaster as ToasterRadix } from "@/components/ui/toaster";
import { Toaster as ToasterSonner } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import SuspendedPostHogPageView from "@/components/providers/posthog-pageview";

const poppinsSans = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
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
      <body className={`${poppinsSans.variable} antialiased`}>
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
