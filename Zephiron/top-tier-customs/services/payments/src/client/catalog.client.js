import ENV from "../config/env.js";

const fetchJSON = async (url) => {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Catalog fetch failed ${res.status}: ${text}`);
  }

  return res.json();
};

export const getProduct = (productID) => {
  return fetchJSON(`${ENV.UPSTREAM.CATALOG}/products/${productID}`);
};

export const getService = (serviceID) => {
  return fetchJSON(`${ENV.UPSTREAM.CATALOG}/services/${serviceID}`);
};
