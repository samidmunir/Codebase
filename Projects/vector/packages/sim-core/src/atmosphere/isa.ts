// International Standard Atmosphere (ISA), used to convert indicated to true airspeed.
// v1 has no wind or non-standard temperature, so ground speed equals true airspeed.

const SEA_LEVEL_TEMPERATURE_K = 288.15;
const LAPSE_RATE_K_PER_FT = 0.0019812;
const TROPOPAUSE_FT = 36_089;
const DENSITY_EXPONENT = 4.25588;
const STRATOSPHERE_SCALE_HEIGHT_FT = 20_806;

/** Air density at altitude relative to sea level (sigma). */
export function densityRatio(altitudeFt: number): number {
  const altitude = Math.max(0, altitudeFt);
  if (altitude <= TROPOPAUSE_FT) {
    const theta = 1 - (LAPSE_RATE_K_PER_FT * altitude) / SEA_LEVEL_TEMPERATURE_K;
    return theta ** DENSITY_EXPONENT;
  }
  return (
    densityRatio(TROPOPAUSE_FT) *
    Math.exp(-(altitude - TROPOPAUSE_FT) / STRATOSPHERE_SCALE_HEIGHT_FT)
  );
}

/** Converts indicated airspeed to true airspeed (knots). */
export function iasToTas(iasKts: number, altitudeFt: number): number {
  return iasKts / Math.sqrt(densityRatio(altitudeFt));
}

/** Converts true airspeed to indicated airspeed (knots). */
export function tasToIas(tasKts: number, altitudeFt: number): number {
  return tasKts * Math.sqrt(densityRatio(altitudeFt));
}
