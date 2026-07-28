import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Metadata, Viewport } from "next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/provider";
import { DemoSessionProvider } from "@/lib/demo-session";

// Inter — humanist grotesque optimised for screen UI; sharp at small sizes.
// Latin, Latin-Extended and Cyrillic subsets, so every supported language
// renders properly. JetBrains Mono — for numbers, codes, and tabular data.
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-sans",
});

const interHeading = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Electronic Journal — Demo",
  description:
    "An interactive demonstration of a role-based electronic journal for attendance, grades, timetables and academic reporting.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        interHeading.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <MotionProvider>
            <I18nProvider>
              <QueryProvider>
                <DemoSessionProvider>
                  <TooltipProvider>{children}</TooltipProvider>
                </DemoSessionProvider>
              </QueryProvider>
            </I18nProvider>
            <Toaster richColors />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
