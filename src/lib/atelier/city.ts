// The atelier works one city at a time.
//
// Not a filter someone remembers to set — a mode the whole surface is in, so a
// new night gets Madrid's capacities and Madrid's currency without anyone
// typing them, and a list never quietly mixes two cities together.
import "server-only";
import { cookies } from "next/headers";
import type { City } from "@prisma/client";
import { HOME_CITY } from "@/lib/cities";

export const ATELIER_CITY_COOKIE = "atelier_city";

const CITIES: City[] = ["BEIRUT", "MADRID"];

export async function atelierCity(): Promise<City> {
  const jar = await cookies();
  const value = jar.get(ATELIER_CITY_COOKIE)?.value;
  return CITIES.find((c) => c === value) ?? HOME_CITY;
}

export async function setAtelierCity(city: City): Promise<void> {
  const jar = await cookies();
  jar.set(ATELIER_CITY_COOKIE, city, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 90 * 24 * 60 * 60,
    path: "/",
  });
}

export const ATELIER_CITIES = CITIES;
