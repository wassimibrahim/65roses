// The city the atelier is currently working in. Two words, one of them lit.
import { ATELIER_CITIES, atelierCity, setAtelierCity } from "@/lib/atelier/city";
import { MonoText } from "@/components/world/MonoText";

export async function CitySwitch() {
  const current = await atelierCity();

  return (
    <div className="ml-auto flex items-baseline gap-4">
      {ATELIER_CITIES.map((city) => (
        <form
          key={city}
          action={async () => {
            "use server";
            await setAtelierCity(city);
          }}
        >
          <button type="submit">
            <MonoText dim={city !== current}>{city}</MonoText>
          </button>
        </form>
      ))}
    </div>
  );
}
