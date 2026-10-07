import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';

// Link-preview images (1200 × 630, the size Open Graph and X expect), drawn on the
// server: a layout (satori, to SVG) and a rasterizer (resvg, to PNG), both pure
// JavaScript and WebAssembly, so the image runs anywhere Node does.

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const require = createRequire(import.meta.url);
const file = (path: string) => readFileSync(require.resolve(path));

const COLORS = {
  bg: '#05080b',
  surface: '#0a1016',
  border: 'rgba(120, 180, 160, 0.18)',
  text: '#e3efe9',
  muted: '#8ba39a',
  faint: '#5d7169',
  target: '#4cf2a0',
  caution: '#ffb547',
  alert: '#ff5a5f',
};

let ready: Promise<{ fonts: Parameters<typeof satori>[1]['fonts'] }> | undefined;

/** Loads the fonts and the rasterizer, once. */
function setUp() {
  ready ??= (async () => {
    await initWasm(file('@resvg/resvg-wasm/index_bg.wasm'));
    const inter = (weight: 400 | 600 | 700) => ({
      name: 'Inter',
      data: file(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`),
      weight,
      style: 'normal' as const,
    });
    const mono = (weight: 400 | 600) => ({
      name: 'JetBrains Mono',
      data: file(`@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff`),
      weight,
      style: 'normal' as const,
    });
    return { fonts: [inter(400), inter(600), inter(700), mono(400), mono(600)] };
  })();
  return ready;
}

// A tiny element builder for satori (it takes React-shaped objects; no JSX needed).
type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: {
    style?: Style;
    children?: Child | Child[];
    src?: string;
    width?: number;
    height?: number;
  };
}
type Child = Node | string;
const el = (type: string, style: Style, ...children: Child[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

/** Vector's mark (the favicon). */
const MARK = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="7" fill="#05080b"/>
    <circle cx="16" cy="16" r="11" fill="none" stroke="#1f4d3a" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="5.5" fill="none" stroke="#1f4d3a" stroke-width="1.5"/>
    <path d="M16 16 L25 9" stroke="#4cf2a0" stroke-width="2" stroke-linecap="round"/>
    <circle cx="21" cy="20" r="2" fill="#4cf2a0"/>
  </svg>`,
).toString('base64')}`;

/** The radar scope behind every card: range rings and a sweep, as an SVG image. */
const SCOPE = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
    <defs><radialGradient id="g" cx="0.78" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#4cf2a0" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#4cf2a0" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${[90, 180, 270, 360, 450]
      .map(
        (r) =>
          `<circle cx="940" cy="265" r="${r}" fill="none" stroke="#4cf2a0" stroke-opacity="${0.16 - r / 5000}" stroke-width="1.5"/>`,
      )
      .join('')}
    <line x1="940" y1="265" x2="1240" y2="40" stroke="#4cf2a0" stroke-opacity="0.35" stroke-width="2"/>
    <circle cx="1065" cy="345" r="5" fill="#4cf2a0" fill-opacity="0.7"/>
    <circle cx="820" cy="150" r="4" fill="#4cf2a0" fill-opacity="0.45"/>
    <circle cx="1010" cy="120" r="4" fill="#b98cff" fill-opacity="0.5"/>
  </svg>`,
).toString('base64')}`;

/** The frame every card shares: the scope, the wordmark, and the site's address. */
function frame(host: string, corner: Child | undefined, body: Child[]): Node {
  return el(
    'div',
    {
      position: 'relative',
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      padding: '56px 64px',
      backgroundColor: COLORS.bg,
      color: COLORS.text,
      fontFamily: 'Inter',
    },
    {
      type: 'img',
      props: {
        src: SCOPE,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        style: { position: 'absolute', top: 0, left: 0 },
      },
    },
    el(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      el(
        'div',
        { alignItems: 'center', gap: 14 },
        {
          type: 'img',
          props: { src: MARK, width: 40, height: 40, style: {} },
        },
        el('div', { fontSize: 30, fontWeight: 700, letterSpacing: 0.5 }, 'Vector'),
      ),
      corner ?? el('div', {}),
    ),
    el('div', { flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, ...body),
    el(
      'div',
      { fontFamily: 'JetBrains Mono', fontSize: 22, color: COLORS.muted, letterSpacing: 1 },
      host,
    ),
  );
}

const pill = (text: string, color: string) =>
  el(
    'div',
    {
      padding: '8px 18px',
      fontSize: 22,
      fontWeight: 600,
      color,
      border: `2px solid ${color}`,
      borderRadius: 999,
      backgroundColor: 'rgba(5, 8, 11, 0.6)',
    },
    text,
  );

const stat = (label: string, value: string, color = COLORS.text) =>
  el(
    'div',
    {
      flexDirection: 'column',
      gap: 6,
      padding: '18px 24px',
      minWidth: 220,
      backgroundColor: 'rgba(10, 16, 22, 0.85)',
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: 14,
    },
    el('div', { fontSize: 20, color: COLORS.muted }, label),
    el('div', { fontFamily: 'JetBrains Mono', fontSize: 40, fontWeight: 600, color }, value),
  );

export interface ResultCard {
  host: string;
  pilot: { displayName: string; handle: string };
  facility: string;
  airspaceName: string;
  /** e.g. 'Hard · 1 h 12 min of sim time'. */
  detail: string;
  rp: string;
  rpNegative: boolean;
  verification: { label: string; tone: 'ok' | 'alert' | 'neutral' };
  stats: { label: string; value: string; alert?: boolean }[];
}

/** A session result: the pilot, the airspace, the RP and how it went. */
export async function resultCard(card: ResultCard): Promise<Buffer> {
  const tone = { ok: COLORS.target, alert: COLORS.alert, neutral: COLORS.muted }[
    card.verification.tone
  ];
  return render(
    frame(card.host, pill(card.verification.label, tone), [
      el(
        'div',
        {
          fontFamily: 'JetBrains Mono',
          fontSize: 24,
          color: COLORS.target,
          letterSpacing: 3,
        },
        `${card.facility} · ${card.airspaceName.toUpperCase()} TRACON`,
      ),
      el(
        'div',
        {
          marginTop: 14,
          fontSize: 104,
          fontWeight: 700,
          letterSpacing: -2,
          lineHeight: 1,
          color: card.rpNegative ? COLORS.alert : COLORS.text,
        },
        card.rp,
      ),
      el(
        'div',
        { marginTop: 18, fontSize: 28, color: COLORS.muted },
        `${card.pilot.displayName} · @${card.pilot.handle} · ${card.detail}`,
      ),
      el(
        'div',
        { marginTop: 36, gap: 16 },
        ...card.stats.map((s) => stat(s.label, s.value, s.alert ? COLORS.alert : COLORS.text)),
      ),
    ]),
  );
}

async function render(node: Node): Promise<Buffer> {
  const { fonts } = await setUp();
  const svg = await satori(node as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts,
  });
  return Buffer.from(
    new Resvg(svg, { fitTo: { mode: 'width', value: CARD_WIDTH } }).render().asPng(),
  );
}
