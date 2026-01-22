"use client";

import { useMemo, useState } from "react";

type Cabin = "economy" | "premium" | "business" | "first";

type Flight = {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveTime: string;
  flightNumber: string;
  durationMins: number;
  priceCents: number;
  cabin: Cabin;
  totalPriceCents?: number;
};

type ApiResponse =
  | {
      ok: true;
      flights: Flight[];
      reason: string | null;
    }
  | {
      ok: false;
      error: any;
    };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function FlightsPage() {
  // Defaults are set to make the demo instantly usable.
  const [from, setFrom] = useState("JFK");
  const [to, setTo] = useState("LAX");
  const [departDate, setDepartDate] = useState(() => todayYYYYMMDD());
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("economy");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);

  const canSearch = useMemo(() => {
    return (
      from.trim().length === 3 &&
      to.trim().length === 3 &&
      departDate.trim().length === 10 &&
      passengers >= 1 &&
      passengers <= 9
    );
  }, [from, to, departDate, passengers]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReason(null);

    if (!canSearch) {
      setError("Please enter a valid route, date, and passenger count.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        departDate,
        passengers: String(passengers),
        cabin,
      });

      const res = await fetch(`/api/flights/search?${params.toString()}`);
      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setFlights([]);
        setReason(null);
        setError("Search failed. Please check inputs and try again.");
        return;
      }

      setFlights(data.flights ?? []);
      setReason(data.reason ?? null);

      if ((data.flights ?? []).length === 0 && !data.reason) {
        setReason(
          "No flights found for this route/date/cabin. Try adjusting filters.",
        );
      }
    } catch {
      setFlights([]);
      setReason(null);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-10 sm:py-12">
      {/* Header */}
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
          <span className="h-2 w-2 rounded-full bg-linear-to-r from-sky-500 to-violet-500" />
          Flight search
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Find your next Lightvelocity flight
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Search routes, compare fares, and book with a clean, premium flow.
          (Fictional airline demo.)
        </p>
      </section>

      {/* Search Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-52 w-190 -translate-x-1/2 rounded-full bg-linear-to-r from-sky-500/20 via-cyan-400/15 to-violet-500/20 blur-3xl" />
        </div>

        <form onSubmit={onSearch} className="relative">
          <div className="grid gap-4 md:grid-cols-12 md:items-end">
            <Field className="md:col-span-3" label="From (IATA)">
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="JFK"
                className={inputClass}
              />
            </Field>

            <Field className="md:col-span-3" label="To (IATA)">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="LAX"
                className={inputClass}
              />
            </Field>

            <Field className="md:col-span-3" label="Depart date">
              <input
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field className="md:col-span-1" label="Pax">
              <input
                type="number"
                min={1}
                max={9}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className={inputClass}
              />
            </Field>

            <Field className="md:col-span-2" label="Cabin">
              <select
                value={cabin}
                onChange={(e) => setCabin(e.target.value as Cabin)}
                className={inputClass}
              >
                <option value="economy">Economy</option>
                <option value="premium">Premium</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tip: Try <span className="font-semibold">JFK → LAX</span> and
              toggle cabin to see different fares.
            </div>

            <button
              type="submit"
              disabled={loading || !canSearch}
              className={cx(
                "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition",
                "bg-linear-to-r from-sky-500 to-violet-500",
                "hover:opacity-95 active:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading ? "Searching…" : "Search flights"}
            </button>
          </div>

          {/* Status messages */}
          <div className="mt-5 space-y-2">
            {error && (
              <Banner tone="error" title="Something went wrong" body={error} />
            )}
            {reason && !error && (
              <Banner tone="info" title="Search update" body={reason} />
            )}
          </div>
        </form>
      </section>

      {/* Results */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Results
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {loading ? "Loading…" : `${flights.length} flight(s)`}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {loading && (
            <>
              <FlightSkeleton />
              <FlightSkeleton />
              <FlightSkeleton />
            </>
          )}

          {!loading && flights.length === 0 && <EmptyState />}

          {!loading &&
            flights.map((f) => (
              <FlightCard key={f.id} flight={f} passengers={passengers} />
            ))}
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition " +
  "placeholder:text-slate-400 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/20 " +
  "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50 dark:placeholder:text-slate-500";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: "info" | "error";
  title: string;
  body: string;
}) {
  const styles =
    tone === "error"
      ? "border-red-200/70 bg-red-50/70 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
      : "border-slate-200/70 bg-white/60 text-slate-900 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-50";

  return (
    <div className={cx("rounded-2xl border p-4 text-sm backdrop-blur", styles)}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-90">{body}</p>
    </div>
  );
}

function FlightCard({
  flight,
  passengers,
}: {
  flight: Flight;
  passengers: number;
}) {
  const total = flight.totalPriceCents ?? flight.priceCents * passengers;

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:bg-white/80 dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/50 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
              {flight.flightNumber}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
              {flight.cabin.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDuration(flight.durationMins)}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:items-center">
            <TimeBlock
              label={flight.from}
              time={flight.departTime}
              sub="Depart"
            />
            <div className="hidden sm:block h-px bg-slate-200/70 dark:bg-slate-800/70" />
            <TimeBlock
              label={flight.to}
              time={flight.arriveTime}
              sub="Arrive"
            />
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Date: <span className="font-semibold">{flight.departDate}</span> •
            Passengers: <span className="font-semibold">{passengers}</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {formatMoney(total)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatMoney(flight.priceCents)} / pax
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-sky-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:opacity-90"
            onClick={() => alert(`Select ${flight.flightNumber} (demo)`)}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({
  label,
  time,
  sub,
}: {
  label: string;
  time: string;
  sub: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {sub}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {time}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-8 text-center backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
      <div className="mx-auto mb-4 h-10 w-10 rounded-2xl bg-linear-to-br from-sky-500 to-violet-500 opacity-90" />
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
        No results yet
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Run a search to see available Lightvelocity flights.
      </p>
    </div>
  );
}

function FlightSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-6 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="hidden sm:block h-px bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
        <div className="h-10 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}
