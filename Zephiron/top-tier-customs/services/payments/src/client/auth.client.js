import ENV from "../config/env.js";

const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth fetch failed ${res.status}: ${text}`);
  }

  return res.json();
};

export const getUser = async (userID) => {
  return fetchJSON(`${ENV.UPSTREAM.AUTH}/internal/users/${userID}`, {
    headers: { "x-internal-secret": ENV.INTERNAL_SECRET },
  });
};

export const setCustomerStripeID = async (userID, customerID) => {
  return fetchJSON(
    `${ENV.UPSTREAM.AUTH}/internal/users/${userID}/stripe-customer`,
    {
      method: "PUT",
      headers: { "x-internal-secret": ENV.INTERNAL_SECRET },
      body: JSON.stringify({ customerID }),
    }
  );
};
