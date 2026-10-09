import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Container, PageHero } from "@/components/site/sections";
import { brand, telHref, whatsappHref } from "@/lib/brand";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call, WhatsApp or message ${brand.name} to book a delivery or ask about a shipment.`,
};

export default function ContactPage() {
  const methods = [
    { icon: Phone, label: "Call dispatch", value: brand.phoneDisplay, href: telHref(brand.phone), external: false },
    { icon: MessageCircle, label: "WhatsApp", value: "Message us", href: whatsappHref(brand.whatsapp, "Hello!"), external: true },
    { icon: Mail, label: "Email", value: brand.email, href: `mailto:${brand.email}`, external: false },
  ];

  return (
    <>
      <PageHero eyebrow="Contact" title="Let's move" accent="something.">
        The quickest way to book is a phone call. For anything else, send a message and we&apos;ll get back to you.
      </PageHero>
      <section className="bg-[#f6f6f8] py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <ul className="border-t border-slate-300">
              {methods.map(({ icon: Icon, label, value, href, external }) => (
                <li key={label} className="border-b border-slate-300">
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="group flex items-center gap-5 py-6"
                  >
                    <span className="grid size-12 shrink-0 place-items-center bg-brand-600 text-white">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs tracking-[0.16em] text-slate-600 uppercase">{label}</span>
                      <span className="mt-1 block truncate font-display text-xl font-bold text-slate-950">{value}</span>
                      {external && <span className="sr-only">(opens in a new tab)</span>}
                    </span>
                    <ArrowUpRight className="size-5 text-brand-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-3 text-slate-700">
              <p className="flex items-start gap-3">
                <MapPin className="mt-1 size-4 shrink-0 text-accent-600" aria-hidden />
                {brand.address}
              </p>
              <p className="flex items-start gap-3">
                <Clock className="mt-1 size-4 shrink-0 text-accent-600" aria-hidden />
                {brand.hours}
              </p>
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-6 sm:p-10">
            <h2 className="font-display text-3xl font-extrabold text-slate-950 uppercase">Send us a message</h2>
            <p className="mt-2 mb-8 text-sm text-slate-600">Fields marked * are required.</p>
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
