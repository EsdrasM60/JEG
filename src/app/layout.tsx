import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { auth } from "@/lib/auth";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JEG Soluciones",
  description: "Gestión de proyectos y mantenimiento - JEG Soluciones",
  icons: {
    icon: '/favicon-32.png',
    apple: '/Logo%20JEG.jpg',
    shortcut: '/favicon.ico'
  }
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="app-bg min-h-screen">
          <Providers session={session}>
            {session ? <Navbar /> : null}
            <main className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">{children}</main>
          </Providers>
        </div>
      </body>
    </html>
  );
}
