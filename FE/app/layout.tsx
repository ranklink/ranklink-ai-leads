import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import Link from "next/link";
import { Bot, Search, Settings2 } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthGate } from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "Leado | AI lead operations",
  description: "Monitor your lead research and outreach agents in one workspace.",
};

function Navbar() {
  return (
    <nav className="agent-nav" aria-label="Main navigation">
      <div className="agent-nav-inner">
        <Link href="/" className="agent-brand"><span className="agent-brand-mark"><Bot size={20} /></span><span>leado<span className="agent-brand-period">.</span></span></Link>
        <div className="agent-nav-links">
          <Link href="/" className="agent-nav-link">Workspace</Link>
          <Link href="/automations" className="agent-nav-link">Agent runs</Link>
          <Link href="/campaigns" className="agent-nav-link">Campaigns</Link>
          <Link href="/leads" className="agent-nav-link">Leads</Link>
          <Link href="/leads/search" className="agent-nav-link agent-nav-search"><Search size={14} /> Find leads</Link>
          <Link href="/dashboard" className="agent-nav-link">Insights</Link>
          <Link href="/settings" className="agent-nav-link agent-nav-settings"><Settings2 size={15} /><span className="sr-only">Settings</span></Link>
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
              <AuthGate>
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
              </AuthGate>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
