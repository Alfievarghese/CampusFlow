import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "CampusFlow — College Event & Hall Management",
  description: "The central hub for managing college events, hall bookings, and campus activities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.fontshare.com/v2/css?f%5B%5D=clash-display@400,500,600,700&f%5B%5D=satoshi@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
