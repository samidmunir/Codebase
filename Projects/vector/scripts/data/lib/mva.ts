// Parser for FAA Minimum Vectoring Altitude charts published as AIXM 5.1.
import type { Ring } from './shapefile';

export interface MvaSector {
  name: string;
  minimumAltitudeFt: number;
  exterior: Ring;
  holes: Ring[];
}

const MEMBER = /<[\w]+:hasMember[^>]*>([\s\S]*?)<\/[\w]+:hasMember>/g;

function posList(xml: string): Ring {
  const match = /<[\w]+:posList[^>]*>([^<]+)<\/[\w]+:posList>/.exec(xml);
  if (!match) throw new Error('Ring without posList');
  const values = match[1]!.trim().split(/\s+/).map(Number);
  const ring: Ring = [];
  // CRS84: longitude first.
  for (let i = 0; i < values.length; i += 2) ring.push([values[i]!, values[i + 1]!]);
  return ring;
}

export function parseMva(xml: string): MvaSector[] {
  const sectors: MvaSector[] = [];
  for (const [, member] of xml.matchAll(MEMBER)) {
    const name = /<[\w]+:name>([^<]*)<\/[\w]+:name>/.exec(member!)?.[1];
    const limit = /<[\w]+:minimumLimit uom="FT">(\d+)<\/[\w]+:minimumLimit>/.exec(member!)?.[1];
    const exterior = /<[\w]+:exterior>([\s\S]*?)<\/[\w]+:exterior>/.exec(member!)?.[1];
    if (name === undefined || limit === undefined || exterior === undefined) {
      throw new Error('MVA sector is missing its name, altitude or boundary');
    }
    const holes = [...member!.matchAll(/<[\w]+:interior>([\s\S]*?)<\/[\w]+:interior>/g)].map(
      ([, ring]) => posList(ring!),
    );
    sectors.push({ name, minimumAltitudeFt: Number(limit), exterior: posList(exterior), holes });
  }
  if (sectors.length === 0) throw new Error('No MVA sectors found');
  return sectors;
}
