import type { FlightSearchInput } from "@/lib/validators/flights";

export type Flight = {
  id: string;
  from: string;
  to: string;
  departDate: string; // YYYY-MM-DD
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  flightNumber: string;
  durationMins: number;
  priceCents: number;
  cabin: FlightSearchInput["cabin"];
};

const MOCK_FLIGHTS: Flight[] = [
  {
    id: "lv_1001",
    from: "JFK",
    to: "LAX",
    departDate: "2026-02-01",
    departTime: "08:10",
    arriveTime: "11:22",
    flightNumber: "LV 101",
    durationMins: 372,
    priceCents: 32900,
    cabin: "economy",
  },
  {
    id: "lv_2002",
    from: "JFK",
    to: "LAX",
    departDate: "2026-02-01",
    departTime: "13:40",
    arriveTime: "16:55",
    flightNumber: "LV 203",
    durationMins: 375,
    priceCents: 45900,
    cabin: "premium",
  },
];

export async function findFlights(input: FlightSearchInput): Promise<Flight[]> {
  // Later: replace this with Supabase query
  return MOCK_FLIGHTS.filter(
    (f) =>
      f.from === input.from.toUpperCase() &&
      f.to === input.to.toUpperCase() &&
      f.departDate === input.departDate &&
      f.cabin === input.cabin,
  );
}
