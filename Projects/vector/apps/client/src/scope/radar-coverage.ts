import type { SessionSettings } from '@vector/shared';
import type { AirspacePack } from '@vector/sim-core';
import { enrouteRadar, terminalRadar, type RadarSensor } from './radar-tracker';

/** Field elevation assumed for the primary radar when the pack doesn't list it. */
const DEFAULT_PRIMARY_ELEVATION_FT = 63;

/**
 * The radars that feed the scope. Realistic coverage: every terminal radar
 * in the pack (range and line of sight) plus modeled long-range coverage above
 * its floor. Everywhere: the primary radar alone sees the whole region. The
 * primary radar's sweep is the one drawn.
 */
export function radarSensors(
  pack: AirspacePack,
  settings: Pick<
    SessionSettings,
    | 'radar.coverage'
    | 'radar.sweepIntervalSec'
    | 'radar.enrouteFloorFt'
    | 'radar.enrouteIntervalSec'
  >,
): { sensors: RadarSensor[]; primary: RadarSensor } {
  const { radar, radars } = pack.airspace;
  const interval = settings['radar.sweepIntervalSec'];
  const primarySite = radars.find((site) => site.name === radar.name);
  const primary = terminalRadar({
    id: primarySite?.id ?? 'PRIMARY',
    position: radar.position,
    antennaElevationFt: primarySite?.antennaElevationFt ?? DEFAULT_PRIMARY_ELEVATION_FT,
    rangeNm: radar.rangeNm,
    intervalSec: interval,
  });

  if (settings['radar.coverage'] === 'everywhere' || radars.length === 0) {
    const everywhere = { ...primary, covers: () => true };
    return { sensors: [everywhere], primary: everywhere };
  }
  const terminal = radars
    .filter((site) => site.id !== primary.id)
    .map((site) => terminalRadar({ ...site, intervalSec: interval }));
  return {
    sensors: [
      primary,
      ...terminal,
      enrouteRadar(
        pack.airspace.center,
        settings['radar.enrouteFloorFt'],
        settings['radar.enrouteIntervalSec'],
      ),
    ],
    primary,
  };
}
