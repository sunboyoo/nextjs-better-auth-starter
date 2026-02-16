import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { ApplicationQueryClientProvider } from "@/components/query-client-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next Better Auth Starter",
  description: "A Next.js boilerplate for building web applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-background`}>
        <ApplicationQueryClientProvider>{children}</ApplicationQueryClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
