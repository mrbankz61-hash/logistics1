import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { brand, telHref, whatsappHref } from "@/lib/brand";
import { Container } from "./sections";

const COMPANY = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/track", label: "Track a shipment" },
];

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-ink-950 text-slate-300">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1.3fr]">
        <div>
          <Logo inverted subLabel="Courier & dispatch" />
          <p className="mt-6 max-w-xs leading-relaxed text-slate-400">{brand.tagline}</p>
          <Link
            href="/track"
            className="mt-8 inline-flex h-12 items-center gap-6 border border-white/25 px-5 text-sm font-semibold text-white hover:border-white/60"
          >
            Track a shipment
            <ArrowUpRight className="size-4 text-accent-500" aria-hidden />
          </Link>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase">Company</h2>
          <ul className="mt-5 space-y-3">
            {COMPANY.map(({ href, label }) => (
              <li key={href}>
                <Link className="text-white hover:text-accent-400" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase">Talk to us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a className="inline-flex items-center gap-3 text-white hover:text-accent-400" href={telHref(brand.phone)}>
                <Phone className="size-4 text-accent-500" aria-hidden /> {brand.phoneDisplay}
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-3 text-white hover:text-accent-400" href={whatsappHref(brand.whatsapp)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4 text-accent-500" aria-hidden /> WhatsApp<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-3 text-white hover:text-accent-400" href={`mailto:${brand.email}`}>
                <Mail className="size-4 text-accent-500" aria-hidden /> {brand.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-accent-500" aria-hidden /> {brand.address}
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-1 size-4 shrink-0 text-accent-500" aria-hidden /> {brand.hours}
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 font-mono text-[11px] tracking-[0.14em] text-slate-400 uppercase sm:flex-row sm:justify-between">
          <p>© {brand.name}. All rights reserved.</p>
          <Link href="/login" className="hover:text-white">
            Staff sign in
          </Link>
        </Container>
      </div>
    </footer>
  );
}
