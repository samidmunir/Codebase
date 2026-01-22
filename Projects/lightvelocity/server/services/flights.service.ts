import type { FlightSearchInput } from "@/lib/validators/flights";
import { findFlights } from "@/server/repos/flights.repo";

export async function searchFlights(input: FlightSearchInput) {
  // Example business rules:
  if (input.from.toUpperCase() === input.to.toUpperCase()) {
    return { flights: [], reason: "Origin and destination must differ." };
  }

  const flights = await findFlights(input);

  // Example: cheapest first
  flights.sort((a, b) => a.priceCents - b.priceCents);

  // Example: total cost scales by passengers
  const enriched = flights.map((f) => ({
    ...f,
    totalPriceCents: f.priceCents * input.passengers,
  }));

  return { flights: enriched, reason: null as string | null };
}
