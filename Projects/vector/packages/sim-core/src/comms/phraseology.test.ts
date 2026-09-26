import { describe, expect, it } from 'vitest';
import {
  altitudeWords,
  flightNumberWords,
  frequencyWords,
  headingWords,
  procedureWords,
  runwayWords,
  speedWords,
  spellDigits,
  spokenCallsign,
} from './phraseology';

describe('phraseology', () => {
  it('spells digits with niner', () => {
    expect(spellDigits('119')).toBe('one one niner');
  });

  it.each([
    ['52', 'fifty-two'],
    ['7', 'seven'],
    ['10', 'ten'],
    ['426', 'four twenty-six'],
    ['400', 'four hundred'],
    ['105', 'one zero five'],
    ['1024', 'ten twenty-four'],
    ['1205', 'twelve zero five'],
    ['2000', 'two thousand'],
    ['2917', 'twenty-nine seventeen'],
  ])('says flight number %s as "%s"', (digits, words) => {
    expect(flightNumberWords(digits)).toBe(words);
  });

  it('builds callsigns from telephony, or phonetically without it', () => {
    expect(spokenCallsign('JBU1024', 'JetBlue')).toBe('JetBlue ten twenty-four');
    expect(spokenCallsign('BAW117', 'Speedbird')).toBe('Speedbird one seventeen');
    expect(spokenCallsign('XYZ12')).toBe('X-ray Yankee Zulu twelve');
    expect(spokenCallsign('DAL45A', 'Delta')).toBe('Delta forty-five Alfa');
  });

  it('says headings as three digits with north as 360', () => {
    expect(headingWords(270)).toBe('two seven zero');
    expect(headingWords(5)).toBe('zero zero five');
    expect(headingWords(0)).toBe('three six zero');
  });

  it.each([
    [4_000, 'four thousand'],
    [11_000, 'one one thousand'],
    [3_500, 'three thousand five hundred'],
    [800, 'eight hundred'],
    [19_000, 'flight level one niner zero'],
  ])('says %d ft as "%s"', (altitude, words) => {
    expect(altitudeWords(altitude)).toBe(words);
  });

  it('says speeds, frequencies and runways', () => {
    expect(speedWords(210)).toBe('two one zero knots');
    expect(frequencyWords(119.1)).toBe('one one niner point one');
    expect(frequencyWords(132.475)).toBe('one three two point four seven five');
    expect(frequencyWords(125)).toBe('one two five point zero');
    expect(runwayWords('04L')).toBe('four left');
    expect(runwayWords('22R')).toBe('two two right');
    expect(runwayWords('13')).toBe('one three');
    expect(procedureWords('PHLBO4')).toBe('PHLBO four');
    expect(procedureWords('Runway heading')).toBe('Runway heading');
  });
});
