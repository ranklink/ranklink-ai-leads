import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import Link from "next/link";
import { SessionGate } from "@/components/auth/SessionGate";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Local Leads - Google Business Lead Gen",
  description: "Discover local businesses using Google Places API",
};

function Navbar() {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center justify-between">
        <Link href="/" className="font-bold text-lg">LocalLeads</Link>
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <Link href="/campaigns" className="hover:text-primary">Campaigns</Link>
          <Link href="/automations" className="hover:text-primary">Agent runs</Link>
          <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
          <Link href="/leads/search" className="hover:text-primary">Find Leads</Link>
          <Link href="/leads" className="hover:text-primary">Leads</Link>
          <Link href="/searches" className="hover:text-primary">Search History</Link>
          <Link href="/settings" className="hover:text-primary">Settings</Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=t==='light'||t==='dark'?t:s;document.documentElement.classList.add(r)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <Navbar />
              <main className="max-w-7xl mx-auto px-4 py-6"><SessionGate>{children}</SessionGate></main>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
