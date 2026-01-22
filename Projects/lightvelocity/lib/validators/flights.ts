import { z } from "zod";

export const FlightSearchSchema = z.object({
  from: z.string().min(3).max(3), // airport code (JFK)
  to: z.string().min(3).max(3),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  passengers: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(["economy", "premium", "business", "first"]).default("economy"),
});

export type FlightSearchInput = z.infer<typeof FlightSearchSchema>;
