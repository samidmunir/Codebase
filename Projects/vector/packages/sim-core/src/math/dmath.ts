// Deterministic math: the same results, to the last bit, in every JavaScript engine.
//
// The ECMAScript spec leaves Math.sin, Math.atan2, Math.exp and their kin to the
// engine ("implementation-approximated"), so Chrome, Safari and Firefox can disagree
// in the last bit, and a simulation replayed elsewhere would drift. These are ports
// of fdlibm (the reference libm that V8's own versions come from), using only
// operations IEEE 754 defines exactly (+ - * / and sqrt). sim-core uses these and
// never the Math versions (ESLint enforces it).

const view = new DataView(new ArrayBuffer(8));

const high = (x: number): number => {
  view.setFloat64(0, x);
  return view.getInt32(0);
};
const low = (x: number): number => {
  view.setFloat64(0, x);
  return view.getUint32(4);
};
const withHigh = (x: number, hi: number): number => {
  view.setFloat64(0, x);
  view.setInt32(0, hi);
  return view.getFloat64(0);
};
const fromWords = (hi: number, lo: number): number => {
  view.setInt32(0, hi);
  view.setUint32(4, lo);
  return view.getFloat64(0);
};

// ---- sin, cos, tan ---------------------------------------------------------------

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

/** sin on [-pi/4, pi/4]; y is the tail of x (x + y is the reduced argument). */
function kernelSin(x: number, y: number, hasTail: boolean): number {
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return hasTail ? x - (z * (0.5 * y - v * r) - y - v * S1) : x + v * (S1 + z * r);
}

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

function kernelCos(x: number, y: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const INV_PIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417;
const PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.0771005063039659766e-11;
const PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.0222662487111664558e-21;
const PIO2_3T = 8.47842766036889956997e-32;

/**
 * Reduces x by multiples of pi/2: returns n with x = n * pi/2 + (y0 + y1). Exact
 * enough for |x| below about 2^19 * pi/2 (far beyond any angle the sim uses).
 */
function remPio2(x: number, out: [number, number]): number {
  const hx = high(x);
  const ix = hx & 0x7fffffff;
  const t0 = x < 0 ? -x : x;
  const n = Math.floor(t0 * INV_PIO2 + 0.5);
  let r = t0 - n * PIO2_1;
  let w = n * PIO2_1T;
  let y0 = r - w;
  const j = ix >> 20;
  let i = j - ((high(y0) >> 20) & 0x7ff);
  if (i > 16) {
    let t = r;
    w = n * PIO2_2;
    r = t - w;
    w = n * PIO2_2T - (t - r - w);
    y0 = r - w;
    i = j - ((high(y0) >> 20) & 0x7ff);
    if (i > 49) {
      t = r;
      w = n * PIO2_3;
      r = t - w;
      w = n * PIO2_3T - (t - r - w);
      y0 = r - w;
    }
  }
  const y1 = r - y0 - w;
  if (hx < 0) {
    out[0] = -y0;
    out[1] = -y1;
    return -n;
  }
  out[0] = y0;
  out[1] = y1;
  return n;
}

const reduced: [number, number] = [0, 0];

export function sin(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, false);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x, reduced) & 3;
  const [y0, y1] = reduced;
  return n === 0
    ? kernelSin(y0, y1, true)
    : n === 1
      ? kernelCos(y0, y1)
      : n === 2
        ? -kernelSin(y0, y1, true)
        : -kernelCos(y0, y1);
}

export function cos(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x, reduced) & 3;
  const [y0, y1] = reduced;
  return n === 0
    ? kernelCos(y0, y1)
    : n === 1
      ? -kernelSin(y0, y1, true)
      : n === 2
        ? -kernelCos(y0, y1)
        : kernelSin(y0, y1, true);
}

export function tan(x: number): number {
  return sin(x) / cos(x);
}

// ---- atan, atan2, asin -------------------------------------------------------------

const ATAN_HI = [
  4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1,
  1.570796326794896558,
];
const ATAN_LO = [
  2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17,
  6.12323399573676603587e-17,
];
const AT = [
  3.33333333333329318027e-1, -1.99999999998764832476e-1, 1.42857142725034663711e-1,
  -1.1111110405462355788e-1, 9.09088713343650656196e-2, -7.69187620504482999495e-2,
  6.66107313738753120669e-2, -5.83357013379057348645e-2, 4.97687799461593236017e-2,
  -3.6531572744216915527e-2, 1.62858201153657823623e-2,
] as const;

export function atan(x0: number): number {
  const hx = high(x0);
  const ix = hx & 0x7fffffff;
  let x = x0;
  if (ix >= 0x44100000) {
    if (Number.isNaN(x)) return x;
    return hx > 0 ? ATAN_HI[3]! + ATAN_LO[3]! : -ATAN_HI[3]! - ATAN_LO[3]!;
  }
  let id: number;
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e200000) return x;
    id = -1;
  } else {
    x = x < 0 ? -x : x;
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) {
        id = 0;
        x = (2 * x - 1) / (2 + x);
      } else {
        id = 1;
        x = (x - 1) / (x + 1);
      }
    } else if (ix < 0x40038000) {
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    } else {
      id = 3;
      x = -1 / x;
    }
  }
  const z = x * x;
  const w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const result = ATAN_HI[id]! - (x * (s1 + s2) - ATAN_LO[id]! - x);
  return hx < 0 ? -result : result;
}

const PI = 3.141592653589793116;
const PI_LO = 1.2246467991473532e-16;
const PI_O_2 = 1.570796326794896558;
const PI_O_4 = 7.85398163397448279e-1;

export function atan2(y: number, x: number): number {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  const hx = high(x);
  const hy = high(y);
  const ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;
  if (x === 1) return atan(y);
  // 2 * (x is negative) + (y is negative).
  const m = ((hy >>> 31) & 1) | ((hx >>> 30) & 2);
  if (y === 0) return m === 0 || m === 1 ? y : m === 2 ? PI : -PI;
  if (x === 0) return hy < 0 ? -PI_O_2 : PI_O_2;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000)
      return m === 0 ? PI_O_4 : m === 1 ? -PI_O_4 : m === 2 ? 3 * PI_O_4 : -3 * PI_O_4;
    return m === 0 ? 0 : m === 1 ? -0 : m === 2 ? PI : -PI;
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 : PI_O_2;
  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) z = PI_O_2 + 0.5 * PI_LO;
  else if (hx < 0 && k < -60) z = 0;
  else {
    const q = y / x;
    z = atan(q < 0 ? -q : q);
  }
  return m === 0 ? z : m === 1 ? -z : m === 2 ? PI - (z - PI_LO) : z - PI_LO - PI;
}

const PIO2_HI = 1.570796326794896558;
const PIO2_LO = 6.12323399573676603587e-17;
const PIO4_HI = 7.85398163397448278999e-1;
const PS0 = 1.66666666666666657415e-1;
const PS1 = -3.25565818622400915405e-1;
const PS2 = 2.01212532134862925881e-1;
const PS3 = -4.00555345006794114027e-2;
const PS4 = 7.91534994289814532176e-4;
const PS5 = 3.4793310759602116757e-5;
const QS1 = -2.40339491173441421878;
const QS2 = 2.02094576023350569471;
const QS3 = -6.8828397160545329303e-1;
const QS4 = 7.70381505559019352791e-2;

export function asin(x: number): number {
  const hx = high(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    if (((ix - 0x3ff00000) | low(x)) === 0) return x * PIO2_HI + x * PIO2_LO;
    return NaN;
  }
  if (ix < 0x3fe00000) {
    if (ix < 0x3e400000) return x;
    const t = x * x;
    const p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
    const q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
    return x + x * (p / q);
  }
  const w = 1 - (x < 0 ? -x : x);
  let t = w * 0.5;
  let p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
  let q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
  const s = Math.sqrt(t);
  if (ix >= 0x3fef3333) {
    t = PIO2_HI - (2 * (s + s * (p / q)) - PIO2_LO);
  } else {
    const wHigh = fromWords(high(s), 0);
    const c = (t - wHigh * wHigh) / (s + wHigh);
    const r = p / q;
    p = 2 * s * r - (PIO2_LO - 2 * c);
    q = PIO4_HI - 2 * wHigh;
    t = PIO4_HI - (p - q);
  }
  return hx > 0 ? t : -t;
}

// ---- exp, log, pow ------------------------------------------------------------------

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.442695040888963387;
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.6533902205465251539e-6;
const P5 = 4.13813679705723846039e-8;
const TWO_M1000 = 9.3326361850321887899e-302;

export function exp(x0: number): number {
  let x = x0;
  const hx0 = high(x);
  const negative = (hx0 >>> 31) & 1;
  const hx = hx0 & 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (Number.isNaN(x)) return x;
      return negative ? 0 : x;
    }
    if (x > 7.09782712893383973096e2) return Infinity;
    if (x < -7.4513321910194110842e2) return 0;
  }
  let hi = 0;
  let lo = 0;
  let k = 0;
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      hi = x - (negative ? -LN2_HI : LN2_HI);
      lo = negative ? -LN2_LO : LN2_LO;
      k = 1 - negative - negative;
    } else {
      k = Math.trunc(INV_LN2 * x + (negative ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    return 1 + x;
  }
  const t = x * x;
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (lo - (x * c) / (2 - c) - hi);
  if (k >= -1021) return withHigh(y, high(y) + (k << 20));
  return withHigh(y, high(y) + ((k + 1000) << 20)) * TWO_M1000;
}

const TWO54 = 1.8014398509481984e16;
const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

export function log(x0: number): number {
  let x = x0;
  let hx = high(x);
  const lx = low(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54;
    x *= TWO54;
    hx = high(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i0 = (hx + 0x95f64) & 0x100000;
  x = withHigh(x, hx | (i0 ^ 0x3ff00000));
  k += i0 >> 20;
  const f = x - 1;
  const dk = k;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) return k === 0 ? 0 : dk * LN2_HI + dk * LN2_LO;
    const r = f * f * (0.5 - 0.3333333333333333 * f);
    return k === 0 ? f - r : dk * LN2_HI - (r - dk * LN2_LO - f);
  }
  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const i = (hx - 0x6147a) | (0x6b851 - hx);
  const r = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    return k === 0
      ? f - (hfsq - s * (hfsq + r))
      : dk * LN2_HI - (hfsq - (s * (hfsq + r) + dk * LN2_LO) - f);
  }
  return k === 0 ? f - s * (f - r) : dk * LN2_HI - (s * (f - r) - dk * LN2_LO - f);
}

/** x to the power y, for x >= 0 (all the sim needs), or a negative x with a whole y. */
export function pow(x: number, y: number): number {
  if (y === 0) return 1;
  if (x === 1) return 1;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (Number.isInteger(y) && Math.abs(y) <= 64) {
    // Exact repeated multiplication (by squaring) for whole powers.
    let base = y < 0 ? 1 / x : x;
    let n = Math.abs(y);
    let result = 1;
    while (n > 0) {
      if (n & 1) result *= base;
      base *= base;
      n >>= 1;
    }
    return result;
  }
  if (x < 0) return NaN;
  if (x === 0) return y > 0 ? 0 : Infinity;
  return exp(y * log(x));
}

/** sqrt(x² + y²) (IEEE sqrt is exact everywhere). */
export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
