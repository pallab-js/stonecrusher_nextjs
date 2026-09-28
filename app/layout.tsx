import type { Metadata } from "next";
import { Hanken_Grotesk, Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoneOps — Stone Crusher Operations",
  description:
    "Local-first operations dashboard for a stone crusher unit: production, inventory, sales, purchases, expenses, analytics and maps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${hanken.variable} h-full dark antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="mesh-bg" aria-hidden />
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
