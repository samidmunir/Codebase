import { NextResponse } from "next/server";
import { FlightSearchSchema } from "@/lib/validators/flights";
import { searchFlights } from "@/server/services/flights.service";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = FlightSearchSchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    departDate: url.searchParams.get("departDate"),
    passengers: url.searchParams.get("passengers") ?? "1",
    cabin: url.searchParams.get("cabin") ?? "economy",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid search input",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await searchFlights(parsed.data);
  return NextResponse.json({ ok: true, ...result });
}
