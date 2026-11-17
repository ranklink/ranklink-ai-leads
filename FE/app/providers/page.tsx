import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, Mail, Phone, Search, Sparkles } from "lucide-react";

const providers = [
  {
    name: "Hunter.io",
    initials: "H",
    color: "#ef6c35",
    description: "Find professional email addresses by domain and verify deliverability.",
    bestFor: "Domain search and email verification",
    allowance: "50 free searches per month",
    features: ["Domain search", "Email finder", "Email verification", "API access"],
    href: "https://hunter.io/",
    icon: Mail,
  },
  {
    name: "Lusha",
    initials: "L",
    color: "#4d54e8",
    description: "Enrich business contacts with direct dial numbers and professional details.",
    bestFor: "Direct dial and contact enrichment",
    allowance: "Free plan with roughly 40 monthly credits",
    features: ["Phone numbers", "Contact enrichment", "Browser extension"],
    href: "https://www.lusha.com/",
    icon: Phone,
  },
  {
    name: "Snov.io",
    initials: "S",
    color: "#2e8cdd",
    description: "Combine email discovery, verification, and drip outreach in one service.",
    bestFor: "Email discovery and outreach workflows",
    allowance: "Free tier with 50 monthly credits",
    features: ["Email finder", "Verification", "Drip campaigns"],
    href: "https://snov.io/",
    icon: Mail,
  },
  {
    name: "Enrich.so",
    initials: "E",
    color: "#7349d8",
    description: "Use a developer-focused REST API for person and company enrichment.",
    bestFor: "API based person and company lookups",
    allowance: "100 free API credits for new accounts",
    features: ["REST API", "Person lookup", "Company lookup"],
    href: "https://www.enrich.so/",
    icon: Building2,
  },
  {
    name: "ZoomInfo Lite",
    initials: "Z",
    color: "#e14d42",
    description: "Explore business contact and company data with firmographic context.",
    bestFor: "Firmographic and company research",
    allowance: "Free access reportedly includes 10 monthly export credits",
    features: ["Company data", "Firmographics", "B2B research"],
    href: "https://www.zoominfo.com/",
    icon: Search,
  },
];

export default function ProvidersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 py-4">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-primary"><Sparkles size={15} /> Agent team</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Data provider sub-agents</h1>
          <p className="mt-3 text-muted-foreground">Choose a specialist provider for contact discovery, verification, enrichment, or company research.</p>
        </div>
        <Link href="/settings" className="inline-flex items-center gap-2 self-start rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent sm:self-auto">Review integrations <ArrowUpRight size={15} /></Link>
      </header>

      <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <BadgeCheck className="mt-0.5 shrink-0 text-primary" size={18} />
        <p>These are provider options for your agent workflow. Free tier allowances are estimates from the supplied provider notes and can change; check each provider for current limits. Opening a provider does not connect an account or send data.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Available data provider sub-agents">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <article key={provider.name} className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: provider.color }} aria-hidden="true">{provider.initials}</span>
                  <div><h2 className="font-semibold">{provider.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">Provider sub-agent</p></div>
                </div>
                <Icon className="text-muted-foreground" size={18} aria-hidden="true" />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">{provider.description}</p>
              <div className="mt-4 rounded-lg bg-muted/60 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best for</p>
                <p className="mt-1 text-sm font-medium">{provider.bestFor}</p>
              </div>
              <p className="mt-4 text-sm"><span className="font-medium">Free tier:</span> <span className="text-muted-foreground">{provider.allowance}</span></p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${provider.name} capabilities`}>
                {provider.features.map((feature) => <li key={feature} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{feature}</li>)}
              </ul>
              <a href={provider.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Explore {provider.name}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
              </a>
            </article>
          );
        })}
      </section>
    </div>
  );
}
