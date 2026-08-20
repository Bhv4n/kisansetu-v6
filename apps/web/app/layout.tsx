import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "KISANSETU | Agricultural Procurement Platform",
  description: "Connecting buyers, farmers and FPOs through transparent contracts, quality traceability and fair pricing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream min-h-screen text-cocoa-500 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
