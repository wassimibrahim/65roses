import {
  Compass,
  Map,
  Target,
  Landmark,
  Briefcase,
  Calculator,
  Network,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV: NavItem[] = [
  { href: "/command", label: "Command", icon: Compass, description: "What deserves attention today" },
  { href: "/atlas", label: "Atlas", icon: Map, description: "The education market map" },
  { href: "/origination", label: "Origination", icon: Target, description: "Research into proprietary deals" },
  { href: "/investors", label: "Investors", icon: Landmark, description: "Mandates and capital" },
  { href: "/deals", label: "Deals", icon: Briefcase, description: "Live transactions" },
  { href: "/underwriting", label: "Underwriting", icon: Calculator, description: "Projections, valuation, returns" },
  { href: "/relationships", label: "Relationships", icon: Network, description: "Who can introduce us" },
  { href: "/intelligence", label: "Intelligence", icon: Newspaper, description: "What changed in the market" },
];
