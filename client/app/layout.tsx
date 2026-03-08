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
      <body>
        <AuthProvider>
          {children}
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
