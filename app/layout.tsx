import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://caelaralabs.com";
const TITLE = "OpsJarvis — Self-Hosted AI Operations Desk | Claude Workflow Automation with Human-in-the-Loop Approvals";
const DESCRIPTION =
  "Self-hosted AI operations desk powered by Claude + Next.js 15. Triages Gmail, WhatsApp Business, Slack and Telegram, drafts the action, and a human approves every write to Stripe, Paystack, Flutterwave, HubSpot and Xero. Keys stay in your .env — you own 100% of the source. Open-core (MIT) by Caelara Labs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Self-Hosted AI Operations Desk",
    "Claude Workflow Automation",
    "Human-in-the-Loop Approvals",
    "AI inbox triage",
    "Gmail automation",
    "WhatsApp Business automation",
    "Slack automation",
    "Telegram automation",
    "Stripe refund approval",
    "Paystack automation",
    "Flutterwave automation",
    "HubSpot CRM automation",
    "Xero automation",
    "Claude AI assistant for small teams",
    "Next.js 15 AI dashboard",
    "open-source AI ops desk",
    "Caelara Labs",
    "OpsJarvis",
  ],
  alternates: { canonical: SITE_URL },
  applicationName: "OpsJarvis",
  authors: [{ name: "Caelara Labs", url: SITE_URL }],
  creator: "Caelara Labs",
  publisher: "Caelara Labs",
  category: "technology",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "OpsJarvis by Caelara Labs",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: `${SITE_URL}/api/gallery/1`, width: 1200, height: 630, alt: "OpsJarvis dashboard — inbox triage, live API status and approval gates" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@opsjarvisai",
    creator: "@opsjarvisai",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/gallery/1`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OpsJarvis",
  alternateName: "OpsJarvis by Caelara Labs",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Operations automation",
  operatingSystem: "Web, Linux (self-hosted), Vercel",
  softwareVersion: "1.0",
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  description: DESCRIPTION,
  featureList: [
    "Unified inbox triage for Gmail, WhatsApp Business, Slack and Telegram",
    "Claude drafts every reply and action; a human approves every external write",
    "Side-by-side execution diff: API payload, before/after state, editable draft",
    "Latency circuit breaker that pauses writes to a degraded downstream API",
    "Integrations: Stripe, Paystack, Flutterwave, HubSpot, Pipedrive, Xero",
    "Keys stay server-side in .env.local; nothing secret reaches the browser",
    "Activity log with actor, time and target for every automated action",
    "Worldwide async delivery across Americas, Africa, Europe, Middle East and APAC",
  ],
  offers: [
    { "@type": "Offer", name: "Basic — Single Workflow Automation", price: "120", priceCurrency: "USD", url: "https://www.fiverr.com/king12fx", description: "1 automated API pipeline or Claude workflow script, .env.example and setup guide. Delivered in 2 days." },
    { "@type": "Offer", name: "Standard — Business Jarvis Dashboard", price: "325", priceCurrency: "USD", url: "https://www.fiverr.com/king12fx", description: "Next.js 15 dark-mode dashboard on Vercel connected to up to 3 REST/OAuth APIs with inbox triage, summaries, read and draft actions. Delivered in 4 days." },
    { "@type": "Offer", name: "Premium — Full AI Operations Desk", price: "950", priceCurrency: "USD", url: "https://www.fiverr.com/king12fx", description: "Multi-step write actions, approval switches, 24/7 PM2 workers, unlimited standard APIs. Full custom build. Delivered in 7 days." },
  ],
  author: { "@type": "Organization", name: "Caelara Labs", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Caelara Labs", url: SITE_URL },
  sameAs: ["https://github.com/kingefman1-cmyk/opsjarvis", "https://x.com/opsjarvisai", "https://t.me/OpsJarvisAI_bot"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
