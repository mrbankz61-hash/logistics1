import type { Metadata, Viewport } from "next";
import { Exo_2, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin"], weight: ["600", "700", "800"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${brand.name} | Courier & delivery`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
};

export const viewport: Viewport = {
  themeColor: "#070914",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${exo.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-900">
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
