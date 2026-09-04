// A door session belongs to one city for the night.
//
// Beirut and Madrid run 00—05 in their own timezones, which overlap, so "the
// night whose doors are open" stops being a single answer the moment there are
// two cities. The host picks once and the choice rides a cookie; every door
// endpoint reads it from here so none of them can drift to a different answer.
import "server-only";
import { cookies } from "next/headers";
import type { City } from "@prisma/client";

export const DOOR_CITY_COOKIE = "door_city";

const CITIES: City[] = ["BEIRUT", "MADRID"];

export async function doorCity(): Promise<City | undefined> {
  const jar = await cookies();
  const value = jar.get(DOOR_CITY_COOKIE)?.value;
  return CITIES.find((c) => c === value);
}

export async function setDoorCity(city: City): Promise<void> {
  const jar = await cookies();
  jar.set(DOOR_CITY_COOKIE, city, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // the night, and a little either side of it
    maxAge: 12 * 60 * 60,
    path: "/",
  });
}
