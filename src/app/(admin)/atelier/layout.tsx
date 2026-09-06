// the atelier — near-black, chalk, hairlines. Dense is allowed; loud is not.
import type { ReactNode } from "react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { MonoText } from "@/components/world/MonoText";
import { CitySwitch } from "./CitySwitch";

export default function AtelierLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh"
      style={{
        background: "var(--black)",
        fontFamily: "var(--font-mono)",
        colorScheme: "dark",
      }}
    >
      <header
        className="flex items-baseline gap-8 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(232, 226, 214, 0.08)" }}
      >
        <MonoText dim={false}>{copy.atelier.title}</MonoText>
        <nav className="flex gap-6">
          <Link href="/atelier/applications">
            <MonoText>{copy.atelier.nav.applications}</MonoText>
          </Link>
          <Link href="/atelier/events">
            <MonoText>{copy.atelier.nav.events}</MonoText>
          </Link>
          <Link href="/atelier/members">
            <MonoText>{copy.atelier.nav.members}</MonoText>
          </Link>
          <Link href="/atelier/referrals">
            <MonoText>{copy.atelier.nav.referrals}</MonoText>
          </Link>
          <Link href="/atelier/deliveries">
            <MonoText>{copy.atelier.nav.deliveries}</MonoText>
          </Link>
          <Link href="/atelier/circle">
            <MonoText>{copy.atelier.nav.circle}</MonoText>
          </Link>
          <Link href="/atelier/attendance">
            <MonoText>{copy.atelier.nav.attendance}</MonoText>
          </Link>
          <Link href="/atelier/messages">
            <MonoText>{copy.atelier.nav.messages}</MonoText>
          </Link>
          <Link href="/atelier/audit">
            <MonoText>{copy.atelier.nav.audit}</MonoText>
          </Link>
          <Link href="/atelier/subscriptions">
            <MonoText>{copy.atelier.nav.subscriptions}</MonoText>
          </Link>
          <Link href="/atelier/nfc">
            <MonoText>{copy.atelier.nav.nfc}</MonoText>
          </Link>
          <Link href="/atelier/settings">
            <MonoText>{copy.atelier.nav.settings}</MonoText>
          </Link>
        </nav>
        <CitySwitch />
      </header>
      {children}
    </div>
  );
}
