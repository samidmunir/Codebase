import {
  AIRSPACE_NAMES,
  type AirspaceId,
  type PilotProfile,
  type ResultDetail,
} from '@vector/shared';
import type { PageMeta } from '../platform/client-app';
import type { ResultsService } from '../results/results-service';
import { drawable, statCard, type StatCard } from './share-card';

// What a shared result or profile looks like where it's shared: the link preview's
// title, description and image (the page's own HTML carries them; see client-app).
// Only what anyone could see is shared: a private profile, or a hidden result, isn't.

const DIFFICULTY: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
  custom: 'Custom',
};

const VERIFICATION: Record<
  ResultDetail['result']['verification'],
  NonNullable<StatCard['badge']> & { sentence: string }
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

const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

const airspaceOf = (id: string) =>
  AIRSPACE_NAMES[id as AirspaceId] ?? { facility: id.toUpperCase(), name: id };

/** The name to draw on a card: the display name, or the handle when the fonts can't draw it. */
const cardName = (pilot: { displayName: string; handle: string }) =>
  drawable(pilot.displayName) ? pilot.displayName : `@${pilot.handle}`;

/** Changes whenever a result's card would: it was updated, or its verification finished. */
export const cardVersion = (result: ResultDetail['result']) =>
  `${Date.parse(result.updatedAt)}${result.verification[0]}`;

type PublicProfile = Extract<PilotProfile, { visibility: 'public' }>;

/** Changes whenever a profile's card would: another session, or a new rank. */
const profileVersion = (profile: PublicProfile) =>
  `${profile.career.sessions}-${Math.round(profile.career.rp)}-${profile.careerRank ?? 0}`;

/** Images kept in memory, oldest dropped first. */
const CACHE_SIZE = 200;

export function shareService(deps: { results: ResultsService; appUrl: string }) {
  const host = new URL(deps.appUrl).host;
  const cache = new Map<string, Promise<Buffer>>();

  /** A card from the cache, or drawn (a failed drawing isn't kept). */
  const cached = (key: string, draw: () => Promise<Buffer>) => {
    let png = cache.get(key);
    if (!png) {
      png = draw();
      png.catch(() => cache.delete(key));
      cache.set(key, png);
      while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
    }
    return png;
  };

  /** As anyone sees them (signed out). */
  const publicResult = (id: string) => deps.results.get(id, undefined).catch(() => undefined);
  const publicProfile = async (handle: string) => {
    const profile = await deps.results.profile(handle, undefined).catch(() => undefined);
    return profile?.visibility === 'public' ? profile : undefined;
  };

  const describeResult = ({ result, pilot }: ResultDetail) => {
    const airspace = airspaceOf(result.airspaceId);
    const detail = [
      result.difficulty ? DIFFICULTY[result.difficulty] : undefined,
      `${formatHours(result.simTimeSec)} of sim time`,
    ]
      .filter(Boolean)
      .join(' · ');
    return { airspace, detail, verification: VERIFICATION[result.verification], pilot };
  };

  /** Where a pilot has the most RP. */
  const bestAirspace = (profile: PublicProfile) =>
    [...profile.byAirspace].sort((a, b) => b.rp - a.rp)[0];

  return {
    /** The link preview for /results/:id, or undefined when it isn't shared. */
    async resultMeta(id: string): Promise<PageMeta | undefined> {
      const found = await publicResult(id);
      if (!found) return undefined;
      const { airspace, detail, verification, pilot } = describeResult(found);
      const { result } = found;
      const { stats } = result;
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

    /** A result's card (PNG), or undefined when it isn't shared. */
    async resultCard(id: string): Promise<Buffer | undefined> {
      const found = await publicResult(id);
      if (!found) return undefined;
      return cached(`r:${id}:${cardVersion(found.result)}`, () => {
        const { airspace, detail, verification, pilot } = describeResult(found);
        const { result } = found;
        const { stats } = result;
        return statCard({
          host,
          badge: verification,
          eyebrow: `${airspace.facility} · ${airspace.name} TRACON`,
          headline: formatRp(result.rp),
          ...(result.rp < 0 ? { headlineTone: 'alert' as const } : {}),
          detail: `${cardName(pilot)} · @${pilot.handle} · ${detail}`,
          stats: [
            { label: 'Arrivals', value: count(stats.arrivals) },
            { label: 'Departures', value: count(stats.departures) },
            { label: 'On time', value: stats.timed > 0 ? `${stats.onTime} / ${stats.timed}` : '–' },
            {
              label: 'Separation losses',
              value: count(stats.separationLosses),
              alert: stats.separationLosses > 0,
            },
          ],
        });
      });
    },

    /** The link preview for /pilots/:handle, or undefined when it isn't shared. */
    async profileMeta(handle: string): Promise<PageMeta | undefined> {
      const profile = await publicProfile(handle);
      if (!profile) return undefined;
      const { pilot, career, careerRank } = profile;
      const best = bestAirspace(profile);
      return {
        title: `${pilot.displayName} (@${pilot.handle}) · Vector`,
        description:
          career.sessions === 0
            ? `${pilot.displayName} controls on Vector, the air traffic control simulator on real FAA airspace.`
            : [
                `${formatRp(career.rp)} over ${plural(career.sessions, 'session')}`,
                `${plural(career.stats.arrivals, 'landing')}`,
                `${formatHours(career.simTimeSec)} controlled`,
                careerRank ? `#${careerRank} on the career records` : undefined,
                best ? `most at ${airspaceOf(best.airspaceId).facility}` : undefined,
              ]
                .filter(Boolean)
                .join(' · ')
                .concat('.'),
        image: `${deps.appUrl}/api/share/pilots/${encodeURIComponent(pilot.handle)}/card.png?v=${profileVersion(profile)}`,
        imageAlt: `${pilot.displayName}’s controller career on Vector`,
      };
    },

    /** A pilot's career card (PNG), or undefined when their profile is private. */
    async profileCard(handle: string): Promise<Buffer | undefined> {
      const profile = await publicProfile(handle);
      if (!profile) return undefined;
      const { pilot, career, careerRank } = profile;
      return cached(`p:${pilot.handle.toLowerCase()}:${profileVersion(profile)}`, () => {
        const best = bestAirspace(profile);
        const joined = new Date(pilot.joinedAt).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
        return statCard({
          host,
          ...(careerRank ? { badge: { label: `Rank #${careerRank}`, tone: 'ok' as const } } : {}),
          eyebrow: best
            ? `Controller · most at ${airspaceOf(best.airspaceId).facility} ${airspaceOf(best.airspaceId).name}`
            : 'Controller on Vector',
          headline: cardName(pilot),
          detail: `@${pilot.handle} · joined ${joined}`,
          stats: [
            {
              label: 'Career RP',
              value: formatRp(career.rp).replace(' RP', ''),
              alert: career.rp < 0,
            },
            { label: 'Sessions', value: count(career.sessions) },
            { label: 'Landed', value: count(career.stats.arrivals) },
            { label: 'Controlled', value: formatHours(career.simTimeSec) },
          ],
        });
      });
    },
  };
}

export type ShareService = ReturnType<typeof shareService>;
