import ENV from "../config/env.js";

export async function quoteCart(items) {
  const url = `${ENV.UPSTREAM.CATALOG}/internal/quote`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": ENV.INTERNAL_SECRET,
    },
    body: JSON.stringify({ items }),
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const msg = data?.message || `Catalog quote failed (${resp.status})`;
    const err = new Error(msg);
    err.status = resp.status;
    throw err;
  }

  return data; // { ok, currency, subtotalCents, items: [...] }
}
