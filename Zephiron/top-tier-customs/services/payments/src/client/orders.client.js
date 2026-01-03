import ENV from "../config/env.js";

const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`Orders call failed ${res.status}: ${await res.text()}`);
  }

  return res.json();
};

export const getOrder = async (orderID) => {
  return fetchJSON(`${ENV.UPSTREAM.ORDERS}/${orderID}`, {
    headers: { "x-internal-secret": ENV.INTERNAL_SECRET },
  });
};

export const markOrderPaid = async (orderID, payload) => {
  return fetchJSON(`${ENV.UPSTREAM.ORDERS}/${orderID}/payment-succeeded`, {
    method: "POST",
    headers: { "x-internal-secret": ENV.INTERNAL_SECRET },
    body: JSON.stringify(payload),
  });
};
