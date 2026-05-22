import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Curtain CRM",
  description: "Curtain CRM web dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className={`${manrope.variable} ${plexMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
