import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Metadata, Viewport } from "next";

import { IosInstallProvider } from "@/components/ios-install-prompt";
import { TooltipProvider } from "@/components/ui/tooltip";

// Inter — humanist grotesque optimised for screen UI; sharp at small sizes, full Cyrillic.
// JetBrains Mono — for numbers, codes, and tabular data.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const interHeading = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Электронный журнал",
  description: "Электронный журнал успеваемости",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Электронный Журнал",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
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
            <QueryProvider>
              <TooltipProvider>
                <IosInstallProvider>{children}</IosInstallProvider>
              </TooltipProvider>
            </QueryProvider>
            <Toaster richColors />
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
