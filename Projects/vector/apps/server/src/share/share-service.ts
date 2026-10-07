import { AIRSPACE_NAMES, type AirspaceId, type ResultDetail } from '@vector/shared';
import type { PageMeta } from '../platform/client-app';
import type { ResultsService } from '../results/results-service';
import { resultCard, type ResultCard } from './share-card';

// What a shared result looks like where it's shared: the link preview's title,
// description and image (the result page's own HTML carries them; see client-app).

const DIFFICULTY: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
  custom: 'Custom',
};

const VERIFICATION: Record<
  ResultDetail['result']['verification'],
  ResultCard['verification'] & { sentence: string }
> = {
  pending: { label: 'Checking', tone: 'neutral', sentence: 'Being verified by replay.' },
  verified: { label: 'Verified', tone: 'ok', sentence: 'Verified by replay.' },
  mismatch: { label: 'Not verified', tone: 'alert', sentence: 'Not verified.' },
  unverifiable: { label: 'Unverified', tone: 'neutral', sentence: 'Unverified.' },
};

/** '+1,240 RP', '−80 RP'. */
const formatRp = (rp: number) =>
  `${rp < 0 ? '−' : rp > 0 ? '+' : ''}${Math.abs(Math.round(rp)).toLocaleString('en-US')} RP`;

/** '1 h 12 min', '45 min'. */
function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** Changes whenever the card would: the result was updated, or its verification finished. */
export const cardVersion = (result: ResultDetail['result']) =>
  `${Date.parse(result.updatedAt)}${result.verification[0]}`;

/** Images kept in memory, newest last (a result's card changes only when it's updated). */
const CACHE_SIZE = 200;

export function shareService(deps: { results: ResultsService; appUrl: string }) {
  const host = new URL(deps.appUrl).host;
  const cache = new Map<string, Promise<Buffer>>();

  /** The result as anyone sees it (a private profile's results aren't shared). */
  const publicResult = (id: string) => deps.results.get(id, undefined);

  const describe = ({ result, pilot }: ResultDetail) => {
    const airspace = AIRSPACE_NAMES[result.airspaceId as AirspaceId] ?? {
      facility: result.airspaceId.toUpperCase(),
      name: result.airspaceId,
    };
    const { stats } = result;
    const detail = [
      result.difficulty ? DIFFICULTY[result.difficulty] : undefined,
      `${formatHours(result.simTimeSec)} of sim time`,
    ]
      .filter(Boolean)
      .join(' · ');
    return { airspace, stats, detail, verification: VERIFICATION[result.verification], pilot };
  };

  return {
    /** The link preview for /results/:id, or undefined when it isn't public. */
    async resultMeta(id: string): Promise<PageMeta | undefined> {
      const found = await publicResult(id).catch(() => undefined);
      if (!found) return undefined;
      const { airspace, stats, detail, verification, pilot } = describe(found);
      const { result } = found;
      const losses = stats.separationLosses;
      return {
        title: `${pilot.displayName} worked ${airspace.facility} ${airspace.name}: ${formatRp(result.rp)} · Vector`,
        description: [
          `${plural(stats.arrivals, 'arrival')} and ${plural(stats.departures, 'departure')}`,
          stats.timed > 0 ? `${stats.onTime} of ${stats.timed} on time` : undefined,
          losses === 0
            ? 'no losses of separation'
            : plural(losses, 'loss of separation', 'losses of separation'),
          `${detail}.`,
        ]
          .filter(Boolean)
          .join(' · ')
          .concat(` ${verification.sentence}`),
        image: `${deps.appUrl}/api/share/results/${result.id}/card.png?v=${cardVersion(result)}`,
        imageAlt: `${pilot.displayName}’s session at ${airspace.facility} ${airspace.name}: ${formatRp(result.rp)}`,
      };
    },

    /** The result's card image (PNG), or undefined when it isn't public. */
    async resultCard(id: string): Promise<Buffer | undefined> {
      const found = await publicResult(id).catch(() => undefined);
      if (!found) return undefined;
      const key = `${id}:${cardVersion(found.result)}`;
      let png = cache.get(key);
      if (!png) {
        const { airspace, stats, detail, verification, pilot } = describe(found);
        png = resultCard({
          host,
          pilot,
          facility: airspace.facility,
          airspaceName: airspace.name,
          detail,
          rp: formatRp(found.result.rp),
          rpNegative: found.result.rp < 0,
          verification,
          stats: [
            { label: 'Arrivals', value: stats.arrivals.toLocaleString('en-US') },
            { label: 'Departures', value: stats.departures.toLocaleString('en-US') },
            { label: 'On time', value: stats.timed > 0 ? `${stats.onTime} / ${stats.timed}` : '–' },
            {
              label: 'Separation losses',
              value: stats.separationLosses.toLocaleString('en-US'),
              alert: stats.separationLosses > 0,
            },
          ],
        });
        // A failed render isn't kept.
        png.catch(() => cache.delete(key));
        cache.set(key, png);
        while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
      }
      return png;
    },
  };
}

export type ShareService = ReturnType<typeof shareService>;
