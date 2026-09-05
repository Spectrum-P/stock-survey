import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Stock Condition", template: "%s | Stock Condition" },
  description: "Field surveys, condition records and planned maintenance in one auditable workspace.",
  applicationName: "Stock Condition",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Stock Condition" },
  formatDetection: { telephone: false }
};

export const viewport = { themeColor: "#0e5a7b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
