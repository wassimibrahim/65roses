"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScoreMark } from "@/components/ui/score";
import { AccessChip } from "@/components/data/access-chip";
import { money, moneyRange, exact, percent } from "@/lib/format";
import { cn, humanise } from "@/lib/utils";

export interface MapPin {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  score: number;
  students: number | null;
  utilisation: number | null;
  evLow: number;
  evHigh: number;
  propertyValue: number | null;
  ownership: string;
  tenure: string;
  type: string;
  accessTier: string;
  strongMatches: number;
  hasOpportunity: boolean;
}

/**
 * Origination heatmap. With no Mapbox token this renders an equirectangular
 * projection of the pins over a plain ground — no basemap, but the geography
 * is real and every filter and interaction works. That is a better fallback
 * than hiding the view behind a missing key.
 */
export function MapView({ pins, hasToken }: { pins: MapPin[]; hasToken: boolean }) {
  const [selected, setSelected] = useState<MapPin | null>(null);

  const bounds = useMemo(() => {
    if (pins.length === 0) return null;
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const pad = 1.5;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [pins]);

  const width = 900;
  const height = 520;

  function project(pin: MapPin) {
    if (!bounds) return { x: 0, y: 0 };
    const x = ((pin.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    // Latitude increases northwards; screen y increases downwards.
    const y = ((bounds.maxLat - pin.lat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="border border-rule-soft bg-ivory">
        <div className="flex items-center justify-between border-b border-rule-soft px-4 py-2.5">
          <span className="eyebrow">
            {hasToken ? "Geographic view" : "Schematic geographic view"}
          </span>
          <span className="text-[10.5px] text-stone">
            {pins.length} institutions · pin size is opportunity score
          </span>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[520px] w-full min-w-[680px] bg-paper"
            role="img"
            aria-label="Institution locations"
          >
            {/* Graticule, so the projection reads as geography rather than a scatter plot. */}
            {bounds
              ? Array.from({ length: 9 }).map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={(i / 8) * width}
                    y1={0}
                    x2={(i / 8) * width}
                    y2={height}
                    stroke="#e6e2d9"
                    strokeWidth="0.5"
                  />
                ))
              : null}
            {bounds
              ? Array.from({ length: 7 }).map((_, i) => (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={(i / 6) * height}
                    x2={width}
                    y2={(i / 6) * height}
                    stroke="#e6e2d9"
                    strokeWidth="0.5"
                  />
                ))
              : null}

            {pins.map((pin) => {
              const { x, y } = project(pin);
              const r = 3 + (pin.score / 100) * 7;
              const isSelected = selected?.id === pin.id;
              return (
                <g
                  key={pin.id}
                  onMouseEnter={() => setSelected(pin)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={pin.score >= 75 ? "#1f4d3a" : pin.score >= 60 ? "#4a5054" : "#9aa0a3"}
                    fillOpacity={isSelected ? 1 : 0.72}
                    stroke={isSelected ? "#16181a" : "none"}
                    strokeWidth="1.2"
                  />
                  {pin.hasOpportunity ? (
                    <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke="#a4884f" strokeWidth="0.8" />
                  ) : null}
                  {pin.score >= 78 || isSelected ? (
                    <text
                      x={x}
                      y={y - r - 4}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#2b2f33"
                      fontFamily="var(--font-inter)"
                    >
                      {pin.name.length > 24 ? `${pin.name.slice(0, 22)}…` : pin.name}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule-soft px-4 py-2.5">
          <Legend colour="#1f4d3a" label="Score 75+" />
          <Legend colour="#4a5054" label="60–74" />
          <Legend colour="#9aa0a3" label="Below 60" />
          <span className="flex items-center gap-1.5 text-[10.5px] text-stone">
            <span className="inline-block size-2 rounded-full border border-gold" /> In origination
          </span>
          {!hasToken ? (
            <span className="ml-auto text-[10.5px] text-stone-light">
              No Mapbox token configured — schematic projection
            </span>
          ) : null}
        </div>
      </div>

      <div className="border border-rule-soft bg-ivory">
        <div className="border-b border-rule-soft px-4 py-2.5">
          <span className="eyebrow">{selected ? "Selected" : "Hover a pin"}</span>
        </div>
        {selected ? (
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/atlas/${selected.slug}`}
                className="display text-[17px] leading-snug text-ink hover:underline"
              >
                {selected.name}
              </Link>
              <ScoreMark score={selected.score} size="md" />
            </div>
            <p className="text-[11px] text-stone">
              {[selected.city, selected.country].filter(Boolean).join(", ")} ·{" "}
              {humanise(selected.type)}
            </p>
            <dl className="space-y-1.5 border-t border-rule-soft pt-3">
              <Row label="Students" value={exact(selected.students)} />
              <Row label="Utilisation" value={percent(selected.utilisation)} />
              <Row label="Estimated EV" value={moneyRange(selected.evLow, selected.evHigh)} />
              <Row
                label="Campus"
                value={
                  selected.propertyValue
                    ? `${humanise(selected.tenure)} · ${money(selected.propertyValue)}`
                    : humanise(selected.tenure)
                }
              />
              <Row label="Ownership" value={humanise(selected.ownership)} />
              <Row label="Strong matches" value={String(selected.strongMatches)} />
            </dl>
            <div className="border-t border-rule-soft pt-3">
              <AccessChip tier={selected.accessTier} />
            </div>
            <Link
              href={`/atlas/${selected.slug}/opportunity`}
              className="inline-block text-[11.5px] text-graphite underline-offset-4 hover:text-ink hover:underline"
            >
              Find opportunity →
            </Link>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-[12px] text-stone">
            Move over a pin to preview the institution.
          </p>
        )}
      </div>
    </div>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10.5px] text-stone">
      <span className="inline-block size-2 rounded-full" style={{ background: colour }} />
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11.5px] text-stone">{label}</dt>
      <dd className="num text-[12px] text-graphite">{value}</dd>
    </div>
  );
}
